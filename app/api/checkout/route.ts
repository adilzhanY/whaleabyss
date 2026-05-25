import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services, users } from '@/lib/schema';
import {
  createFreekassaOrder,
  ALLOWED_METHOD_IDS,
  FREEKASSA_METHODS,
} from '@/lib/freekassa';
import { inArray, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { validatePromocodeForUser } from '@/lib/promocodeValidation';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Creates a pending order and returns a Freekassa SCI redirect URL.
 * The client should redirect the user to the returned `url`.
 *
 * SECURITY: all prices and the order total are recomputed server-side from the
 * current DB `services.price`. The client-supplied `total` and `item.price` are
 * never trusted — they are ignored entirely.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore - augmented in next-auth session callback
    const userId: string | null = session?.user?.id || null;

    const body = await req.json();
    const { items, email, telegram, inGameName, method, promocode } = body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      console.error('[Checkout] Validation failed: items empty');
      return new NextResponse('Invalid request data', { status: 400 });
    }

    if (!email) {
      return new NextResponse('Email is required for receipts', { status: 400 });
    }

    // Validate `method` (payment method id) if supplied. Note: all payments are
    // routed via SBP (44) below regardless — Freekassa only supports SBP on API
    // 2.0 — but we still reject an out-of-range client value.
    if (method !== undefined && method !== null && method !== '') {
      const m = Number(method);
      if (!Number.isFinite(m) || !ALLOWED_METHOD_IDS.has(m)) {
        return new NextResponse('Invalid payment method', { status: 400 });
      }
    }

    // Normalise + validate line items. Quantities must be positive integers.
    // Per-slug quantities are summed so a duplicated slug can't sneak past checks.
    const qtyBySlug = new Map<string, number>();
    const dateBySlug = new Map<string, { startDate?: string; endDate?: string }>();
    for (const item of items as any[]) {
      const slug = item?.id;
      const qty = Math.floor(Number(item?.quantity));
      if (!slug || typeof slug !== 'string' || !Number.isFinite(qty) || qty < 1) {
        return new NextResponse('Invalid request data', { status: 400 });
      }
      qtyBySlug.set(slug, (qtyBySlug.get(slug) ?? 0) + qty);
      // Keep subscription dates (first occurrence wins).
      if (!dateBySlug.has(slug)) {
        dateBySlug.set(slug, { startDate: item?.startDate, endDate: item?.endDate });
      }
    }

    // Map frontend slugs → DB services. Fetch the authoritative price and the
    // test flag; test services are excluded from public checkout.
    const slugs = [...qtyBySlug.keys()];
    const dbServices = await db
      .select({
        id: services.id,
        slug: services.slug,
        price: services.price,
        isTestService: services.isTestService,
      })
      .from(services)
      .where(inArray(services.slug, slugs));

    if (dbServices.length !== slugs.length || dbServices.some((s) => s.isTestService)) {
      return new NextResponse('Invalid request data', { status: 400 });
    }

    // Compute each line's unit price + subtotal from current DB prices.
    let subtotal = 0;
    const itemRows = dbServices.map((s) => {
      const quantity = qtyBySlug.get(s.slug)!;
      const unit = Number(s.price);
      subtotal += unit * quantity;
      const dates = dateBySlug.get(s.slug) ?? {};
      return { service: s, quantity, unit, dates };
    });
    subtotal = round2(subtotal);

    // Apply a promocode server-side (same helper as the admin manual-order flow).
    // The validation helper enforces existence/expiry and the per-user single-use
    // rule, so it only applies to logged-in users. Guests checking out with a code
    // simply get no discount (and the code isn't recorded as used).
    let discountPercent = 0;
    let promocodeCode: string | null = null;
    if (promocode && typeof promocode === 'string' && promocode.trim() && userId) {
      const promo = await validatePromocodeForUser(promocode.trim(), userId);
      if (!promo.ok) {
        return new NextResponse(promo.error, { status: 400 });
      }
      discountPercent = promo.discountPercent;
      promocodeCode = promo.code;
    }

    const total = round2(subtotal * (1 - discountPercent / 100));

    const userNotes = `Email: ${email}\nTelegram: ${telegram}\nIn-Game Name: ${inGameName}${promocodeCode ? `\nPromocode: ${promocodeCode}` : ''}`;

    // Persist latest contact info for logged-in users and prefer their saved receipt email.
    let receiptEmail = email as string;
    if (userId) {
      await db
        .update(users)
        .set({
          telegramUsername: telegram,
          gameUsername: inGameName,
          receiptEmail: email,
        })
        .where(eq(users.id, userId));

      const userRecord = await db
        .select({ receiptEmail: users.receiptEmail })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userRecord[0]?.receiptEmail) {
        receiptEmail = userRecord[0].receiptEmail;
      }
    }

    // 1. Create pending order.
    const newOrderRaw = await db
      .insert(orders)
      .values({
        ...(userId ? { userId } : {}),
        totalPrice: total.toFixed(2),
        status: 'pending',
        userNotes,
        promocode: promocodeCode,
      })
      .returning({ id: orders.id });

    const newOrderId = newOrderRaw[0].id;

    // 2. Insert order items (priceAtPurchase = current DB unit price).
    const insertItems = itemRows.map((r) => ({
      orderId: newOrderId,
      serviceId: r.service.id,
      quantity: r.quantity,
      priceAtPurchase: r.unit.toFixed(2),
      ...(r.dates.startDate ? { startDate: new Date(r.dates.startDate) } : {}),
      ...(r.dates.endDate ? { endDate: new Date(r.dates.endDate) } : {}),
    }));
    await db.insert(orderItems).values(insertItems);

    // 3. Build the payment URL.
    //
    //    Freekassa support states that only SBP (44) is available
    //    and requires using API 2.0. So we route all payments via API 2.0.
    let paymentUrl: string;

    const xff = req.headers.get('x-forwarded-for') || '';
    const clientIp = xff.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';

    const fkOrder = await createFreekassaOrder({
      orderId: newOrderId,
      amount: total,
      email: receiptEmail,
      ip: clientIp,
      currency: 'RUB',
      paymentMethodId: FREEKASSA_METHODS.SBP, // Always use SBP 44
    });
    paymentUrl = fkOrder.location;

    console.log('--- [Checkout] Redirecting user to payment provider:', paymentUrl);

    return NextResponse.json({ url: paymentUrl });
  } catch (error) {
    console.error('[Checkout Error]', error);
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(message, { status: 500 });
  }
}
