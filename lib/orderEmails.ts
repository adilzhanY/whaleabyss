import { db } from './db';
import { orders, orderItems, services, users } from './schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { sendOrderPaidEmail, sendOrderCompletedEmail } from './email';

/**
 * Exactly-once customer emails for order events, guarded by DB claims
 * (orders.paid_email_sent_at / completed_email_sent_at).
 *
 * Pattern: claim-then-send. The claim is a conditional UPDATE … RETURNING —
 * whichever caller wins the row sends; everyone else no-ops. This holds under
 * concurrent Freekassa webhook retries, repeated admin PATCHes, and the
 * portal + admin both completing the same order (the modal double-show bug
 * taught us not to trust call-site discipline).
 *
 * On a FAILED send the claim is reset to NULL so a later trigger can retry
 * (for the paid email, FK's own webhook retries serve as the retry schedule).
 * Both helpers never throw — an email must never fail an order transition.
 */

type OrderRow = typeof orders.$inferSelect;

/** receiptEmail ?? email via userId; guests: the «Email: …» line checkout writes into userNotes. */
async function resolveOrderRecipient(order: OrderRow): Promise<string | null> {
  if (order.userId) {
    const [user] = await db
      .select({ email: users.email, receiptEmail: users.receiptEmail })
      .from(users)
      .where(eq(users.id, order.userId));
    const email = user?.receiptEmail || user?.email;
    if (email) return email;
  }
  const match = order.userNotes?.match(/Email:\s*([^\n]+)/);
  return match ? match[1].trim() : null;
}

async function fetchItems(orderId: string) {
  const rows = await db
    .select({
      title: services.title,
      quantity: orderItems.quantity,
      price: orderItems.priceAtPurchase,
    })
    .from(orderItems)
    .leftJoin(services, eq(orderItems.serviceId, services.id))
    .where(eq(orderItems.orderId, orderId));
  return rows.map((r) => ({
    title: r.title ?? 'Услуга',
    quantity: r.quantity ?? 1,
    price: parseFloat(r.price),
  }));
}

async function claim(
  orderId: string,
  column: 'paidEmailSentAt' | 'completedEmailSentAt'
): Promise<OrderRow | null> {
  const col = column === 'paidEmailSentAt' ? orders.paidEmailSentAt : orders.completedEmailSentAt;
  const [row] = await db
    .update(orders)
    .set({ [column]: new Date() })
    .where(and(eq(orders.id, orderId), isNull(col)))
    .returning();
  return row ?? null;
}

async function release(orderId: string, column: 'paidEmailSentAt' | 'completedEmailSentAt') {
  try {
    await db
      .update(orders)
      .set({ [column]: sql`NULL` })
      .where(eq(orders.id, orderId));
  } catch (e) {
    console.error('[orderEmails] failed to release claim', orderId, e);
  }
}

/**
 * «Оплата получена» — claimed by the FK webhook. `recipientHint` is the payer
 * email FK reports (P_EMAIL); it wins over the account email when present,
 * preserving the old webhook behaviour.
 */
export async function claimAndSendPaidEmail(
  orderId: string,
  opts: { recipientHint?: string } = {}
): Promise<void> {
  try {
    const order = await claim(orderId, 'paidEmailSentAt');
    if (!order) return;
    const to = opts.recipientHint || (await resolveOrderRecipient(order));
    if (!to) {
      console.warn(`[orderEmails] no recipient for paid email, order ${orderId}`);
      return; // claim kept: without a recipient a retry can't do better
    }
    try {
      await sendOrderPaidEmail(to, {
        orderId,
        items: await fetchItems(orderId),
        totalAmount: parseFloat(order.totalPrice),
        orderDate: order.createdAt ?? new Date(),
      });
    } catch (sendErr) {
      console.error(`[orderEmails] paid email send failed, re-arming ${orderId}`, sendErr);
      await release(orderId, 'paidEmailSentAt');
    }
  } catch (err) {
    console.error('[orderEmails] claimAndSendPaidEmail error', orderId, err);
  }
}

/** «Заказ выполнен» — claimed by the admin PATCH and the portal complete route. */
export async function claimAndSendCompletedEmail(orderId: string): Promise<void> {
  try {
    const order = await claim(orderId, 'completedEmailSentAt');
    if (!order) return;
    const to = await resolveOrderRecipient(order);
    if (!to) {
      console.warn(`[orderEmails] no recipient for completed email, order ${orderId}`);
      return;
    }
    try {
      await sendOrderCompletedEmail(to, { orderId, items: await fetchItems(orderId) });
    } catch (sendErr) {
      console.error(`[orderEmails] completed email send failed, re-arming ${orderId}`, sendErr);
      await release(orderId, 'completedEmailSentAt');
    }
  } catch (err) {
    console.error('[orderEmails] claimAndSendCompletedEmail error', orderId, err);
  }
}
