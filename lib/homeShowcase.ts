import { cache } from 'react';
import { db } from '@/lib/db';
import { orderItems, orders, services } from '@/lib/schema';
import { desc, inArray, sql } from 'drizzle-orm';
import { getServiceCategories, type ServiceItem } from '@/lib/services';

export interface CategoryTile {
  slug: string;
  title: string;
  count: number;
  minPrice: number;
  /** Background of the category's first service with art; '' = gradient fallback. */
  image: string;
  /** Up to 4 distinct service images - the double-size tile renders a collage,
   *  because one zoomed-in card image looks accidental at 2x2. */
  images: string[];
}

/**
 * One tile per real category for the home page «Чем поможем?» grid, largest
 * first (the layout renders the first tile double-size). «Актуальное» is a
 * spotlight that duplicates services from their native categories, so it is
 * not a tile.
 */
export const getCategoryTiles = cache(async (): Promise<CategoryTile[]> => {
  const cats = await getServiceCategories();
  return cats
    .filter((c) => c.slug !== 'actual' && c.items.length > 0)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      count: c.items.length,
      minPrice: Math.min(...c.items.map((i) => i.price)),
      image: c.items.find((i) => i.background)?.background ?? '',
      images: [...new Set(c.items.map((i) => i.background).filter(Boolean))].slice(0, 4),
    }))
    .sort((a, b) => b.count - a.count);
});

/**
 * Top services by real sales for the «Популярные услуги» rail: order lines are
 * counted across paid/in-progress/completed orders. Test services never make
 * the list (the catalogue items they're matched against exclude them), and if
 * fewer than `limit` services have ever been ordered the rail is topped up
 * from the front of the catalogue so it never renders half-empty.
 */
export const getBestsellers = cache(
  async (limit = 5): Promise<ServiceItem[]> => {
    const cats = await getServiceCategories();
    const all = cats.flatMap((c) => c.items);
    // «Актуальное» duplicates items — dedupe by slug, first occurrence wins.
    const seen = new Set<string>();
    const catalogue = all.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });

    let ranked: ServiceItem[] = [];
    try {
      const rows = await db
        .select({
          serviceId: orderItems.serviceId,
          sales: sql<number>`count(*)`.mapWith(Number),
        })
        .from(orderItems)
        .innerJoin(orders, sql`${orderItems.orderId} = ${orders.id}`)
        .where(inArray(orders.status, ['paid', 'in_progress', 'completed']))
        .groupBy(orderItems.serviceId)
        .orderBy(desc(sql`count(*)`));

      const ids = rows
        .map((r) => r.serviceId)
        .filter((id): id is string => id != null);
      if (ids.length > 0) {
        const slugRows = await db
          .select({ id: services.id, slug: services.slug })
          .from(services)
          .where(inArray(services.id, ids));
        const slugById = new Map(slugRows.map((r) => [r.id, r.slug]));
        ranked = ids
          .map((id) => catalogue.find((i) => i.id === slugById.get(id)))
          .filter((i): i is ServiceItem => Boolean(i));
      }
    } catch (err) {
      // The rail is decoration, not a dependency - fall back to the catalogue
      // order rather than failing the home page render.
      console.error('getBestsellers: sales query failed', err);
    }

    const picked: ServiceItem[] = [];
    const used = new Set<string>();
    for (const item of [...ranked, ...catalogue]) {
      if (used.has(item.id)) continue;
      used.add(item.id);
      picked.push(item);
      if (picked.length >= limit) break;
    }
    return picked;
  }
);
