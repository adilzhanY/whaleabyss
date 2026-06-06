import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services } from '@/lib/schema';
import {
  createFreekassaOrder,
  ALLOWED_METHOD_IDS,
  FREEKASSA_METHODS,
} from '@/lib/freekassa';
import { inArray } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { requireAdminApi } from '@/lib/auth/requireAdmin';
import { getClientIp } from '@/lib/rateLimit';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * ADMIN-ONLY testing checkout for the new SBP/card FreeKassa flow.
 *
 * This is a deliberate parallel to `/api/checkout` so the public checkout (SBP
 * only) is never touched while the card channel (i=36) is being validated. It:
 *   - is gated to admins (middleware + requireAdminApi),
 *   - RESPECTS the chosen payment method (44 SBP or 36 card) instead of forcing SBP,
 *   - marks the order `isTestPayment = true` and records `paymentMethod`,
 *   - recomputes the amount server-side from current DB prices (no client trust).
 *
 * The shared FK webhook flips the order to `paid` and runs normal fulfillment.
 */
export async function POST(req: NextRequest) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore - augmented in next-auth session callback
    const userId: string | null = session?.user?.id || null;

    const body = await req.json();
    const { items, email, telegram, adventureRank, method } = body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return new NextResponse('Invalid request data', { status: 400 });
    }
    if (!email) {
      return new NextResponse('Email is required', { status: 400 });
    }

    // Method is REQUIRED here and must be one we accept (44 SBP / 36 card).
    const methodId = Number(method);
    if (!Number.isFinite(methodId) || !ALLOWED_METHOD_IDS.has(methodId)) {
      return new NextResponse('Invalid payment method', { status: 400 });
    }
    const paymentMethodLabel = methodId === FREEKASSA_METHODS.CARD_RUB ? 'card' : 'sbp';

    // Sum quantities per slug.
    const qtyBySlug = new Map<string, number>();
    for (const item of items as any[]) {
      const slug = item?.id;
      const qty = Math.floor(Number(item?.quantity));
      if (!slug || typeof slug !== 'string' || !Number.isFinite(qty) || qty < 1) {
        return new NextResponse('Invalid request data', { status: 400 });
      }
      qtyBySlug.set(slug, (qtyBySlug.get(slug) ?? 0) + qty);
    }

    // Authoritative prices from DB. Unlike the public checkout, test services are
    // NOT rejected here — this flow exists to test real services in /admin/testing.
    const slugs = [...qtyBySlug.keys()];
    const dbServices = await db
      .select({ id: services.id, slug: services.slug, price: services.price })
      .from(services)
      .where(inArray(services.slug, slugs));

    if (dbServices.length !== slugs.length) {
      return new NextResponse('Unknown service', { status: 400 });
    }

    let total = 0;
    const itemRows = dbServices.map((s) => {
      const quantity = qtyBySlug.get(s.slug)!;
      const unit = Number(s.price);
      total += unit * quantity;
      return { service: s, quantity, unit };
    });
    total = round2(total);

    const userNotes = `[ТЕСТ ОПЛАТЫ] Email: ${email}\nTelegram: ${telegram}\nAdventure Rank: ${adventureRank ?? '—'}\nМетод: ${paymentMethodLabel}`;

    // 1. Create the pending test order.
    const newOrderRaw = await db
      .insert(orders)
      .values({
        ...(userId ? { userId } : {}),
        totalPrice: total.toFixed(2),
        status: 'pending',
        userNotes,
        paymentMethod: paymentMethodLabel,
        isTestPayment: true,
      })
      .returning({ id: orders.id });
    const newOrderId = newOrderRaw[0].id;

    // 2. Insert order items.
    await db.insert(orderItems).values(
      itemRows.map((r) => ({
        orderId: newOrderId,
        serviceId: r.service.id,
        quantity: r.quantity,
        priceAtPurchase: r.unit.toFixed(2),
      })),
    );

    // 3. Create the FK order with the CHOSEN method. FK rejects 127.0.0.1, so fall
    //    back to a configured server IP when the real client IP isn't available.
    const rawIp = getClientIp(req.headers);
    const clientIp =
      rawIp && rawIp !== 'unknown' && rawIp !== '127.0.0.1'
        ? rawIp
        : process.env.FREEKASSA_FALLBACK_IP || rawIp;

    const fkOrder = await createFreekassaOrder({
      orderId: newOrderId,
      amount: total,
      email,
      ip: clientIp,
      currency: 'RUB',
      paymentMethodId: methodId,
    });

    return NextResponse.json({ url: fkOrder.location });
  } catch (error) {
    console.error('[Testing Checkout Error]', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(message, { status: 500 });
  }
}
