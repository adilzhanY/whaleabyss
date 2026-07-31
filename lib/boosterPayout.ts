import { db } from '@/lib/db';
import { orders, orderItems, boosters } from '@/lib/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

/**
 * Credits a booster's commission share when their order is completed.
 *
 * Commission = full (pre-discount) order price * booster.commissionPercent / 100,
 * added to `booster.balance`. The base is Σ order_items.priceAtPurchase × quantity —
 * NOT orders.totalPrice — so a customer's promocode discount doesn't reduce the
 * booster's cut. Falls back to totalPrice for legacy orders with no line items. The credited amount is recorded in `orders.boosterEarning`,
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
      // Pre-discount order value (promocodes only reduce totalPrice).
      fullPrice: sql<string | null>`(
        select sum(${orderItems.priceAtPurchase} * coalesce(${orderItems.quantity}, 1))
        from ${orderItems} where ${orderItems.orderId} = ${orders.id}
      )`,
      status: orders.status,
      boosterEarning: orders.boosterEarning,
      isTestPayment: orders.isTestPayment,
      commissionPercent: boosters.commissionPercent,
    })
    .from(orders)
    .leftJoin(boosters, eq(orders.boosterId, boosters.id))
    .where(eq(orders.id, orderId));

  if (
    !row ||
    row.status !== 'completed' ||
    !row.boosterId ||
    row.boosterEarning != null || // already credited
    // A test order is not money: completing one must never move a real balance.
    row.isTestPayment === true
  ) {
    return;
  }

  const base = row.fullPrice != null ? Number(row.fullPrice) : Number(row.totalPrice);
  const earning = (base * (row.commissionPercent ?? 0)) / 100;
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
