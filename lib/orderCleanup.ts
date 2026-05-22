import { db } from '@/lib/db';
import { orders } from '@/lib/schema';
import { and, eq, isNull, lt } from 'drizzle-orm';

export const PENDING_TIMEOUT_HOURS = 1;
export const CANCELLED_DELETE_DAYS = 1;

/**
 * Mark pending orders older than PENDING_TIMEOUT_HOURS as `cancelled`.
 * A late Freekassa webhook for one of these will re-open it (see
 * `app/api/payment/freekassa/notify/route.ts`).
 */
export async function cancelStalePendingOrders() {
  const cutoff = new Date(Date.now() - PENDING_TIMEOUT_HOURS * 60 * 60 * 1000);
  const result = await db
    .update(orders)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(orders.status, 'pending'), lt(orders.createdAt, cutoff)))
    .returning({ id: orders.id });
  return result.length;
}

/**
 * Permanently delete cancelled orders that were never paid and have sat
 * untouched for at least CANCELLED_DELETE_DAYS. `paymentId IS NULL` is the
 * "never paid" indicator — orders cancelled by an admin after payment retain
 * their paymentId and are preserved for audit. `order_items` cascade.
 */
export async function deleteOldNeverPaidCancelledOrders() {
  const cutoff = new Date(
    Date.now() - CANCELLED_DELETE_DAYS * 24 * 60 * 60 * 1000
  );
  const result = await db
    .delete(orders)
    .where(
      and(
        eq(orders.status, 'cancelled'),
        isNull(orders.paymentId),
        lt(orders.updatedAt, cutoff)
      )
    )
    .returning({ id: orders.id });
  return result.length;
}

export async function runOrderCleanup() {
  const cancelled = await cancelStalePendingOrders();
  const deleted = await deleteOldNeverPaidCancelledOrders();
  return { cancelled, deleted };
}
