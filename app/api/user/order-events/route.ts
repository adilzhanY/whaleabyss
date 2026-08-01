import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services } from '@/lib/schema';
import { and, desc, eq, inArray, isNull, isNotNull } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { enforceRateLimit, RATE_TIERS } from '@/lib/apiRateLimit';

export const dynamic = 'force-dynamic';

/**
 * Celebration events («оплата прошла» / «заказ выполнен»), CLAIM semantics:
 * one POST atomically finds the customer's next unseen event AND stamps it as
 * seen, then returns it. The caller shows the modal for whatever it receives.
 *
 * Claim-before-show is the whole design (same pattern as lib/orderEmails):
 * the previous GET + fire-and-forget ack left a window where the ack was lost
 * (tab closed, dev remount, network blip) and the modal re-appeared later —
 * with the conditional UPDATE … RETURNING there is exactly one winner per
 * event across tabs, devices and remounts, enforced by the database. The
 * trade-off (a claimed event whose tab dies in the same instant is never
 * shown) is deliberate: showing twice is worse than the rare never-shown.
 *
 * «Выполнен» outranks «оплачен» for the same order; claiming it closes both
 * flags so the paid modal can never trail behind. Test orders included on
 * purpose — they exist so the admin can preview the customer experience.
 */
export async function POST(req: NextRequest) {
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

    const now = new Date();

    for (const candidate of candidates) {
      const isCompleted = candidate.status === 'completed' && candidate.completedNotifiedAt === null;
      const isPaid = !isCompleted && candidate.paidNotifiedAt === null;
      if (!isCompleted && !isPaid) continue;

      // Atomic claim: exactly one request across all tabs/devices wins this
      // row; the losers just move on (usually to "no event").
      const claimed = await db
        .update(orders)
        .set(
          isCompleted
            ? { completedNotifiedAt: now, paidNotifiedAt: now }
            : { paidNotifiedAt: now }
        )
        .where(
          and(
            eq(orders.id, candidate.id),
            isCompleted ? isNull(orders.completedNotifiedAt) : isNull(orders.paidNotifiedAt)
          )
        )
        .returning({ id: orders.id });
      if (claimed.length === 0) continue;

      const items = await db
        .select({ title: services.title, quantity: orderItems.quantity })
        .from(orderItems)
        .leftJoin(services, eq(orderItems.serviceId, services.id))
        .where(eq(orderItems.orderId, candidate.id));

      return NextResponse.json({
        event: {
          type: isCompleted ? 'completed' : 'paid',
          orderId: candidate.id,
          items: items.map((i) => ({ title: i.title ?? 'Услуга', quantity: i.quantity ?? 1 })),
          total: Number(candidate.totalPrice),
        },
      });
    }

    return NextResponse.json({ event: null });
  } catch (error) {
    console.error('[order-events POST]', error);
    return NextResponse.json({ event: null });
  }
}
