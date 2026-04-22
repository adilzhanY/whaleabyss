import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import {
  verifyFreekassaNotification,
  FREEKASSA_NOTIFY_IPS,
  shouldCheckNotifyIp,
} from '@/lib/freekassa';

/**
 * Freekassa notification endpoint.
 *
 * Freekassa sends a POST (application/x-www-form-urlencoded) with fields:
 *   MERCHANT_ID            — shop id
 *   AMOUNT                 — paid amount (two decimals)
 *   intid                  — FK internal order id
 *   MERCHANT_ORDER_ID      — our order id (UUID) we sent as `paymentId`
 *   P_EMAIL                — payer email
 *   P_PHONE                — payer phone (optional)
 *   CUR_ID                 — currency id
 *   SIGN                   — md5(MERCHANT_ID:AMOUNT:SECRET2:MERCHANT_ORDER_ID)
 *   us_...                 — any custom params we added
 *
 * Expected response body: plain text "YES" on success. Anything else makes
 * Freekassa retry for up to 24h.
 */
export async function POST(req: NextRequest) {
  return handle(req);
}

// Some FK test tooling hits the URL with GET as a connectivity probe.
export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  try {
    // 1. IP allow-list (optional hardening, enabled via FREEKASSA_CHECK_IP=true).
    if (shouldCheckNotifyIp()) {
      const xff = req.headers.get('x-forwarded-for') || '';
      const clientIp = xff.split(',')[0].trim() || req.headers.get('x-real-ip') || '';
      if (!FREEKASSA_NOTIFY_IPS.has(clientIp)) {
        console.warn('[Freekassa] Rejected notification from untrusted IP:', clientIp);
        return new NextResponse('forbidden', { status: 403 });
      }
    }

    // 2. Parse body. FK posts form-urlencoded; accept JSON too just in case.
    const contentType = req.headers.get('content-type') || '';
    let data: Record<string, string> = {};

    if (contentType.includes('application/json')) {
      const parsed = await req.json();
      data = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, String(v ?? '')])
      );
    } else {
      const form = await req.formData();
      form.forEach((v, k) => {
        data[k] = String(v);
      });
    }

    // Some deployments also put params in the query string. Merge those too.
    req.nextUrl.searchParams.forEach((v, k) => {
      if (!(k in data)) data[k] = v;
    });

    const merchantId = data.MERCHANT_ID;
    const amount = data.AMOUNT;
    const merchantOrderId = data.MERCHANT_ORDER_ID;
    const sign = data.SIGN;
    const fkOrderId = data.intid;

    if (!merchantId || !amount || !merchantOrderId || !sign) {
      console.warn('[Freekassa] Missing required parameters:', data);
      return new NextResponse('missing parameters', { status: 400 });
    }

    // 3. Verify signature.
    const ok = verifyFreekassaNotification({
      merchantId,
      amount,
      merchantOrderId,
      sign,
    });
    if (!ok) {
      console.warn(`[Freekassa] Invalid signature for order ${merchantOrderId}`);
      return new NextResponse('bad sign', { status: 400 });
    }

    // 4. Load the order and sanity-check the amount.
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, merchantOrderId))
      .limit(1);

    if (orderRows.length === 0) {
      console.warn(`[Freekassa] Order not found: ${merchantOrderId}`);
      return new NextResponse('order not found', { status: 404 });
    }

    const order = orderRows[0];

    if (parseFloat(amount) !== parseFloat(order.totalPrice.toString())) {
      console.warn(
        `[Freekassa] Amount mismatch for order ${merchantOrderId}. Expected ${order.totalPrice}, got ${amount}`
      );
      return new NextResponse('amount mismatch', { status: 400 });
    }

    // 5. If already processed, still answer YES so FK stops retrying.
    if (order.status !== 'pending') {
      return new NextResponse('YES', { status: 200 });
    }

    // 6. Mark paid; store FK's internal order id as paymentId.
    await db
      .update(orders)
      .set({
        status: 'paid',
        paymentId: fkOrderId ?? null,
      })
      .where(eq(orders.id, order.id));

    console.log(`[Freekassa] Order ${merchantOrderId} successfully PAID (fk intid=${fkOrderId}).`);

    // 7. Notify admin via Telegram (best effort — never fail the webhook for this).
    try {
      const { notifyAdminAboutOrder } = await import('@/lib/telegramClient');
      const { orderItems, services } = await import('@/lib/schema');
      const { eq: eqInner } = await import('drizzle-orm');

      const items = await db
        .select({
          title: services.title,
          quantity: orderItems.quantity,
          price: orderItems.priceAtPurchase,
        })
        .from(orderItems)
        .leftJoin(services, eqInner(orderItems.serviceId, services.id))
        .where(eqInner(orderItems.orderId, merchantOrderId));

      const itemsDescription = items
        .map((i) => `- ${i.title} (x${i.quantity}) - ${i.price} руб.`)
        .join('\n');

      await notifyAdminAboutOrder({
        id: merchantOrderId,
        totalAmount: amount,
        itemsDescription,
        userNotes: order.userNotes,
      });
    } catch (tgError) {
      console.error('[Telegram] Failed to send admin notification:', tgError);
    }

    return new NextResponse('YES', { status: 200 });
  } catch (err) {
    console.error('[Freekassa Webhook Error]', err);
    return new NextResponse('internal error', { status: 500 });
  }
}
