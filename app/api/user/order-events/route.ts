import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services } from '@/lib/schema';
import { and, desc, eq, inArray, isNull, isNotNull } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { enforceRateLimit, RATE_TIERS } from '@/lib/apiRateLimit';

export const dynamic = 'force-dynamic';

/**
 * Celebration events for the signed-in customer, one at a time:
 * - 'completed' — an order flipped to «Выполнен» and the modal wasn't shown yet;
 * - 'paid'      — a payment landed (paymentId set) and the modal wasn't shown yet.
 * «Выполнен» wins when both are pending for the same order — one modal, and the
 * ack below closes both flags so the paid one can never trail behind it.
 *
 * The flags live on the ORDER (paid_notified_at / completed_notified_at), so
 * "show only once" holds across devices and browsers, not per-localStorage.
 * Test orders (isTestPayment) are deliberately included: they exist so an admin
 * can preview exactly what a customer sees, this modal included.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ event: null });

    const limited = enforceRateLimit(req, 'order-events', RATE_TIERS.read, userId);
    if (limited) return limited;

    const candidates = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        completedNotifiedAt: orders.completedNotifiedAt,
        paidNotifiedAt: orders.paidNotifiedAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          inArray(orders.status, ['paid', 'in_progress', 'completed']),
          isNotNull(orders.paymentId)
        )
      )
      .orderBy(desc(orders.updatedAt))
      .limit(20);

    const completedEvent = candidates.find(
      (o) => o.status === 'completed' && o.completedNotifiedAt === null
    );
    const paidEvent = completedEvent
      ? undefined
      : candidates.find((o) => o.paidNotifiedAt === null);
    const order = completedEvent ?? paidEvent;
    if (!order) return NextResponse.json({ event: null });

    const items = await db
      .select({ title: services.title, quantity: orderItems.quantity })
      .from(orderItems)
      .leftJoin(services, eq(orderItems.serviceId, services.id))
      .where(eq(orderItems.orderId, order.id));

    return NextResponse.json({
      event: {
        type: completedEvent ? 'completed' : 'paid',
        orderId: order.id,
        items: items.map((i) => ({ title: i.title ?? 'Услуга', quantity: i.quantity ?? 1 })),
        total: Number(order.totalPrice),
      },
    });
  } catch (error) {
    console.error('[order-events GET]', error);
    return NextResponse.json({ event: null });
  }
}

/** Ack: the modal was shown. 'completed' closes the paid flag too. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limited = enforceRateLimit(req, 'order-events-ack', RATE_TIERS.sync, userId);
    if (limited) return limited;

    const { orderId, type } = await req.json();
    if (typeof orderId !== 'string' || (type !== 'paid' && type !== 'completed')) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const now = new Date();
    await db
      .update(orders)
      .set(
        type === 'completed'
          ? { completedNotifiedAt: now, paidNotifiedAt: now }
          : { paidNotifiedAt: now }
      )
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.userId, userId),
          type === 'completed' ? isNull(orders.completedNotifiedAt) : isNull(orders.paidNotifiedAt)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[order-events POST]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
