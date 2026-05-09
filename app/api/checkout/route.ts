import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services, users, promocodes, promocodeUsage } from '@/lib/schema';
import {
  buildFreekassaPaymentUrl,
  createFreekassaOrder,
  ALLOWED_METHOD_IDS,
  FREEKASSA_METHODS,
} from '@/lib/freekassa';
import { inArray, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Creates a pending order and returns a Freekassa SCI redirect URL.
 * The client should redirect the user to the returned `url`.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore - augmented in next-auth session callback
    const userId: string | null = session?.user?.id || null;

    const body = await req.json();
    const { items, total, email, telegram, inGameName, method, promocode } = body ?? {};

    console.log('--- [Checkout] Incoming request:', {
      items,
      total,
      email,
      telegram,
      inGameName,
      method,
      promocode,
    });

    if (!items || items.length === 0 || !total) {
      console.error('[Checkout] Validation failed: items or total empty');
      return new NextResponse('Invalid request data', { status: 400 });
    }

    if (!email) {
      return new NextResponse('Email is required for receipts', { status: 400 });
    }

    // Validate `method` (payment method id). Defaults to bank card if absent.
    let paymentMethodId: number = FREEKASSA_METHODS.SBP;
    if (method !== undefined && method !== null && method !== '') {
      const m = Number(method);
      if (!Number.isFinite(m) || !ALLOWED_METHOD_IDS.has(m)) {
        return new NextResponse('Invalid payment method', { status: 400 });
      }
      paymentMethodId = m;
    }

    const userNotes = `Email: ${email}\nTelegram: ${telegram}\nIn-Game Name: ${inGameName}${promocode ? `\nPromocode: ${promocode}` : ''}`;

    // Map frontend slugs → DB UUIDs.
    const slugs = items.map((item: any) => item.id);
    const dbServices = await db
      .select({ id: services.id, slug: services.slug })
      .from(services)
      .where(inArray(services.slug, slugs));

    const slugToIdMap = new Map<string, string>();
    dbServices.forEach((s) => slugToIdMap.set(s.slug, s.id));

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
        totalPrice: total.toString(),
        status: 'pending',
        userNotes,
        promocode: promocode ? promocode.toUpperCase() : null,
      })
      .returning({ id: orders.id });

    const newOrderId = newOrderRaw[0].id;

    // 2. Insert order items.
    const insertItems = items.map((item: any) => {
      const actualServiceId = slugToIdMap.get(item.id);
      if (!actualServiceId) {
        throw new Error(`Service not found for slug: ${item.id}`);
      }
      return {
        orderId: newOrderId,
        serviceId: actualServiceId,
        quantity: item.quantity,
        priceAtPurchase: item.price.toString(),
      };
    });
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
      amount: Number(total),
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
