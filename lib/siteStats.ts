import { db } from '@/lib/db';
import { orders, reviews, services } from '@/lib/schema';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { cache } from 'react';
import { notTestOrder } from '@/lib/testOrders';
// The public «N+» counter lives in lib/completedOrders (client-safe module).

/**
 * Real numbers for the homepage trust strip.
 *
 * Queried live, never hardcoded. Trust signals are the conversion lever on a
 * RU boosting site, which is exactly why they must not be invented — a made-up
 * review count or order total is a claim to a paying customer. If a figure is
 * too small to be worth showing, the hero drops that item rather than rounding
 * it up (see HomeClient).
 *
 * `reviewCount`/`rating` deliberately exclude `reviews.isFake` rows: those are
 * seeded display copy, and counting them would be the same lie in a different
 * table.
 */
export interface SiteStats {
  /** Genuine (non-seeded) published reviews. */
  reviewCount: number;
  /** Mean rating over those reviews, 1 decimal — null when there are none. */
  rating: number | null;
  /** Orders that actually got paid for (any status after payment). */
  paidOrders: number;
  /** Orders delivered end to end — the honest "выполнено" figure. */
  completedOrders: number;
  /** Cheapest public, non-test service — the price anchor on the primary CTA. */
  minPrice: number | null;
}

export const getSiteStats = cache(async (): Promise<SiteStats> => {
  try {
    const [reviewRow] = await db
      .select({
        n: sql<number>`count(*)::int`,
        avg: sql<number | null>`avg(${reviews.rating})`,
      })
      .from(reviews)
      .where(eq(reviews.isFake, false));

    const [orderRow] = await db
      .select({
        paid: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')::int`,
      })
      .from(orders)
      // notTestOrder: admin rehearsals have paymentId='TEST' and were being
      // counted as real orders here — the one place that must never inflate.
      .where(and(isNotNull(orders.paymentId), notTestOrder));

    const [priceRow] = await db
      .select({ min: sql<string | null>`min(${services.price}::numeric)` })
      .from(services)
      .where(and(eq(services.isTestService, false)));

    return {
      reviewCount: reviewRow?.n ?? 0,
      rating: reviewRow?.avg != null ? Math.round(Number(reviewRow.avg) * 10) / 10 : null,
      paidOrders: orderRow?.paid ?? 0,
      completedOrders: orderRow?.completed ?? 0,
      minPrice: priceRow?.min != null ? Number(priceRow.min) : null,
    };
  } catch (error) {
    // The hero must render even if this query fails — every consumer treats
    // null/0 as "don't show that signal" rather than showing a wrong one.
    console.error('[siteStats] failed, hero will omit trust figures:', error);
    return { reviewCount: 0, rating: null, paidOrders: 0, completedOrders: 0, minPrice: null };
  }
});
