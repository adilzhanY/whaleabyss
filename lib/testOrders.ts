import { sql } from 'drizzle-orm';
import { orders } from '@/lib/schema';

/**
 * Test orders — `orders.isTestPayment = true`.
 *
 * They are created from the admin testing flow (and from the «оформить как
 * тестовый» button on /cart) so an admin can see how a live order looks to the
 * CUSTOMER — the active-boost card, «Мои заказы», the booster's portal — without
 * paying for it.
 *
 * The flag used to be decorative: it only painted a «ТЕСТ» badge in the admin
 * orders table, while every money query counted such an order as real. Anything
 * that reports business results, notifies, or pays a booster MUST filter with
 * `notTestOrder`; the two conditions below are the single place that rule lives.
 *
 * Deliberately NOT filtered: `/api/user/orders` and the customer-facing pages.
 * Seeing the order there is the entire point of a test order.
 */
export const notTestOrder = sql`coalesce(${orders.isTestPayment}, false) = false`;

/** The inverse — used only by the /admin/testing list. */
export const isTestOrder = sql`coalesce(${orders.isTestPayment}, false) = true`;
