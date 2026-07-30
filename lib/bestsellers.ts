import { cache } from 'react';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orderItems, orders, services } from '@/lib/schema';

/**
 * The services customers actually buy, most-ordered first.
 *
 * Counted as *distinct paid orders*, not summed quantity: one order for 60 days
 * of account maintenance is one person choosing it, and ranking by quantity
 * would let a single per-day purchase outrank a genuinely popular service.
 *
 * Returns **slugs**, because `ServiceItem.id` is the slug everywhere in the UI
 * (`lib/services.ts` maps `services.slug` → `ServiceItem.id`), not the uuid.
 */
export const getBestsellerSlugs = cache(async (limit = 10): Promise<string[]> => {
  try {
    const rows = await db
      .select({
        slug: services.slug,
        n: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(orderItems)
      .innerJoin(services, eq(services.id, orderItems.serviceId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(isNotNull(orders.paymentId), eq(services.isTestService, false)))
      .groupBy(services.slug)
      .orderBy(desc(sql`count(distinct ${orders.id})`))
      .limit(limit);

    return rows.map((r) => r.slug);
  } catch (error) {
    // The catalog must render even if this fails — every consumer treats an
    // empty list as "don't show the bestseller rail", never as an error state.
    console.error('[bestsellers] failed, /services will omit the rail:', error);
    return [];
  }
});
