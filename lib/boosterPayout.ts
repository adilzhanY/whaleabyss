import { db } from '@/lib/db';
import { orders, boosters } from '@/lib/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

/**
 * Credits a booster's commission share when their order is completed.
 *
 * Commission = order.totalPrice * booster.commissionPercent / 100, added to
 * `booster.balance`. The credited amount is recorded in `orders.boosterEarning`,
 * which doubles as an idempotency guard: the balance is only ever incremented
 * once per order, no matter how many times the order is re-marked "completed".
 *
 * This is a side-account: it never touches `orders.totalPrice`, so the admin
 * dashboard revenue (which sums totalPrice) is unaffected.
 *
 * Safe to call on any status change — it no-ops unless the order is currently
 * completed, has a booster assigned, and hasn't been credited yet.
 */
export async function creditBoosterForCompletedOrder(orderId: string): Promise<void> {
  const [row] = await db
    .select({
      boosterId: orders.boosterId,
      totalPrice: orders.totalPrice,
      status: orders.status,
      boosterEarning: orders.boosterEarning,
      commissionPercent: boosters.commissionPercent,
    })
    .from(orders)
    .leftJoin(boosters, eq(orders.boosterId, boosters.id))
    .where(eq(orders.id, orderId));

  if (
    !row ||
    row.status !== 'completed' ||
    !row.boosterId ||
    row.boosterEarning != null // already credited
  ) {
    return;
  }

  const earning = (Number(row.totalPrice) * (row.commissionPercent ?? 0)) / 100;
  const earningStr = earning.toFixed(2);

  // Atomically claim the credit: only write boosterEarning if still NULL.
  // If a concurrent call already set it, this returns no rows and we bail,
  // guaranteeing the balance is incremented exactly once.
  const claimed = await db
    .update(orders)
    .set({ boosterEarning: earningStr })
    .where(and(eq(orders.id, orderId), isNull(orders.boosterEarning)))
    .returning({ id: orders.id });

  if (claimed.length === 0) return;

  await db
    .update(boosters)
    .set({
      balance: sql`${boosters.balance} + ${earningStr}`,
      updatedAt: new Date(),
    })
    .where(eq(boosters.id, row.boosterId));
}
