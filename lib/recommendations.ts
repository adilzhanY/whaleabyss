import { cache } from 'react';
import { db } from '@/lib/db';
import { services, serviceAddons } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { getServiceCategories, type ServiceItem } from '@/lib/services';

export const RECOMMENDED_COUNT = 5;

/**
 * Region words of a display name: lowercased, with version numbers ("4.0",
 * "6.7") and "100%" stripped, so «Фонтейн 4.1», «Фонтейн 100%» and «Фонтейн»
 * all reduce to the same token set. Two services belong to the same region
 * when their token sets intersect - this also groups «Тропики Сумеру» with
 * «Оазис Сумеру», and «Ли Юэ + Долина Чэньюй» with both of its parts.
 */
function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/\d+([.,]\d+)?/g, ' ')
      .replace(/%/g, ' ')
      .split(/[^a-zа-яё]+/i)
      .filter((w) => w.length >= 2)
  );
}

function shareToken(a: Set<string>, b: Set<string>): boolean {
  for (const w of a) if (b.has(w)) return true;
  return false;
}

/**
 * Exactly RECOMMENDED_COUNT services to show under «С этим товаром часто
 * покупают» on a service page.
 *
 * 1. Same-region siblings first (closest in catalogue order): a part like
 *    «Фонтейн 4.0» recommends the other Фонтейн parts and «Фонтейн 100%».
 * 2. If the service IS a part and its siblings don't fill the row, its linked
 *    quest addons top it up, most expensive first.
 * 3. Anything still missing is filled with the nearest services in the same
 *    category (so a standalone region like «Драконий Хребет 100%» simply gets
 *    its catalogue neighbours), then the global list as a last resort.
 */
export const getRecommendedServices = cache(
  async (slug: string): Promise<ServiceItem[]> => {
    const cats = await getServiceCategories();
    const all = cats.flatMap((c) => c.items);
    const self = all.find((s) => s.id === slug);
    if (!self) return [];

    const cat = cats.find((c) => c.slug === self.categorySlug);
    const catItems = cat ? cat.items : [];
    const selfIdx = catItems.findIndex((i) => i.id === slug);

    const picked: ServiceItem[] = [];
    const used = new Set<string>([slug]);
    const take = (item: ServiceItem | undefined) => {
      if (!item || used.has(item.id) || picked.length >= RECOMMENDED_COUNT) return;
      used.add(item.id);
      picked.push(item);
    };

    // Category neighbours ordered by distance from this service; ties go to
    // the earlier item, matching how the catalogue reads.
    const byProximity = catItems
      .map((item, idx) => ({ item, d: Math.abs(idx - selfIdx), idx }))
      .filter(({ item }) => item.id !== slug)
      .sort((a, b) => a.d - b.d || a.idx - b.idx)
      .map(({ item }) => item);

    const selfTokens = nameTokens(self.subtitle || self.title);
    const siblings = byProximity.filter((i) =>
      shareToken(nameTokens(i.subtitle || i.title), selfTokens)
    );
    siblings.forEach(take);

    // Quest addons only make sense as filler for a *part* of a region - a
    // standalone service with no siblings gets neighbours, not its quests.
    if (siblings.length > 0 && picked.length < RECOMMENDED_COUNT) {
      const [row] = await db
        .select({ id: services.id })
        .from(services)
        .where(eq(services.slug, slug));
      if (row) {
        const links = await db
          .select({ addonServiceId: serviceAddons.addonServiceId })
          .from(serviceAddons)
          .where(eq(serviceAddons.parentServiceId, row.id));
        if (links.length > 0) {
          const addonRows = await db
            .select({ slug: services.slug, price: services.price })
            .from(services)
            .where(inArray(services.id, links.map((l) => l.addonServiceId)));
          addonRows
            .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
            // `all` only contains non-test services, so test addons drop out here.
            .forEach((r) => take(all.find((i) => i.id === r.slug)));
        }
      }
    }

    byProximity.forEach(take);
    all.forEach(take);

    return picked;
  }
);
