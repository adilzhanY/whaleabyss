import { db } from '@/lib/db';
import { categories, services, serviceAddons } from '@/lib/schema';
import { cache } from 'react';
import { eq } from 'drizzle-orm';
import servicesData from '@/services/services_list.json';

export interface ServiceItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  description: string;
  gradient: string;
  background: string;
  categorySlug?: string;
  isWide?: boolean;
  isTall?: boolean;
  isExtraTall?: boolean;
  isSquare?: boolean;
  isPerDay?: boolean;
  /**
   * True when this service has at least one (non-test) linked quest service in
   * `service_addons`, i.e. adding it MUST go through QuestAddonModal so the
   * client declares what happens to the gating quests.
   *
   * Server-rendered on purpose: the add-to-cart flow used to answer this
   * question with a live fetch to /api/services/[slug]/addons, so a single
   * failed request silently skipped the modal and added an undeclared line.
   * The decision now cannot fail; the fetch is only needed for the quest LIST.
   * A stale `false` (link added after a listing page was prerendered) is caught
   * by the /api/checkout gate, which rejects undeclared quest-gated lines.
   */
  hasQuestAddons?: boolean;
  /** Display name of the owning category, for the breadcrumb chip on the
   *  service page. Slugs are admin-editable, so never hardcode a slug→label
   *  map in the UI — carry the real title through. */
  categoryTitle?: string;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  title: string;
  items: ServiceItem[];
}

// Per-day services (account management) are sold by period: the detail page
// shows a date picker and `quantity` means "number of days". Shared by the UI
// enrichment below and the checkout backstop that derives missing dates.
export function isPerDayServiceName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('уход за аккаунтом') || n.includes('техническое обслуживание');
}

const gradients = [
  'linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #60a5fa 100%)',
  'linear-gradient(135deg, #b2bec3 0%, #636e72 50%, #74b9ff 100%)',
  'linear-gradient(135deg, #55efc4 0%, #00b894 50%, #0984e3 100%)',
  'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 50%, #e17055 100%)',
  'linear-gradient(135deg, #fd79a8 0%, #e05a6b 50%, #2d3436 100%)',
  'linear-gradient(135deg, #e17055 0%, #fdcb6e 40%, #f97316 100%)',
  'linear-gradient(135deg, #00cec9 0%, #55efc4 50%, #81ecec 100%)',
  'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)',
  'linear-gradient(135deg, #2d3436 0%, #636e72 40%, #f97316 100%)',
  'linear-gradient(135deg, #f97316 0%, #fb923c 40%, #2d3436 100%)',
  'linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)',
  'linear-gradient(135deg, #818cf8 0%, #4338ca 50%, #312e81 100%)'
];

function enrichItemUI(item: any, index: number): Omit<ServiceItem, 'id' | 'title' | 'subtitle' | 'price' | 'description' | 'background'> {
  const nameLower = (item.subtitle || item.title).toLowerCase();

  const is_wide = item.subtitle?.includes('+') ||
    item.subtitle?.includes('Тропики и Пустыня') ||
    item.subtitle?.includes('Мондштадт 100%') ||
    item.subtitle?.includes('Сбор диковинок') ||
    item.subtitle?.includes('Аранары 100%') ||
    item.subtitle?.includes('Араньяка 100%') ||
    item.subtitle?.includes('Ли Юэ + Долина Чэньюй') ||
    item.subtitle?.includes('Араньяка +');

  const is_nod_krai = nameLower.includes('нод-край');
  const is_plot = nameLower.includes('сюжет');
  const is_square = nameLower.includes('задание') || is_nod_krai;
  const is_tall = is_plot && !is_nod_krai;
  const is_extra_tall = is_tall && !nameLower.includes('мондштадт');
  const is_per_day = isPerDayServiceName(nameLower);

  return {
    isWide: is_wide,
    isTall: is_tall,
    isExtraTall: is_extra_tall,
    isSquare: is_square,
    isPerDay: is_per_day,
    gradient: gradients[index % gradients.length]
  };
}

export const getServiceCategories = cache(async (): Promise<ServiceCategory[]> => {
  const allCategories = await db.select().from(categories);
  const allServices = await db.select().from(services).where(eq(services.isTestService, false));

  // Which services are quest-gated. Kept as two plain queries + a JS intersect
  // rather than a join, so the "non-test addon" rule stays visibly identical to
  // /api/services/[slug]/addons and the /api/checkout gate.
  const liveServiceIds = new Set(allServices.map(s => s.id));
  const addonLinks = await db
    .select({
      parentServiceId: serviceAddons.parentServiceId,
      addonServiceId: serviceAddons.addonServiceId,
    })
    .from(serviceAddons);
  const questGatedIds = new Set(
    addonLinks
      .filter(l => liveServiceIds.has(l.addonServiceId))
      .map(l => l.parentServiceId)
  );

  let globalIndex = 0;

  const orderMap = new Map<string, number>();
  let oIdx = 0;
  for (const catList of Object.values(servicesData)) {
    for (const it of catList) {
      orderMap.set(it.name.trim().toLowerCase(), oIdx++);
    }
  }

  // Native category slug per service id, so a service featured into «Актуальное»
  // keeps its real category on the detail page / for discounts.
  const catSlugById = new Map(allCategories.map(c => [c.id, c.slug]));
  const catTitleById = new Map(allCategories.map(c => [c.id, c.title]));

  return allCategories.map(cat => {
    // The «actual» category also gathers services flagged featuredInActual,
    // regardless of their native category (spotlight without re-homing them).
    let catServices =
      cat.slug === 'actual'
        ? allServices.filter(s => s.categoryId === cat.id || s.featuredInActual)
        : allServices.filter(s => s.categoryId === cat.id);

    // Sort array by json implicit order
    catServices.sort((a, b) => {
      const aT = (a.subtitle || a.title).trim().toLowerCase();
      const bT = (b.subtitle || b.title).trim().toLowerCase();
      const aP = orderMap.has(aT) ? orderMap.get(aT)! : 9999;
      const bP = orderMap.has(bT) ? orderMap.get(bT)! : 9999;
      if (aP !== bP) return aP - bP;

      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return aTime - bTime;
    });

    return {
      id: cat.slug,
      slug: cat.slug,
      title: cat.title,
      items: catServices.map(s => {
        const idx = globalIndex++;
        return {
          id: s.slug,
          title: s.title,
          subtitle: s.subtitle || s.title,
          price: parseFloat(s.price),
          description: s.description || '',
          background: s.imageUrl || '',
          categorySlug: (s.categoryId && catSlugById.get(s.categoryId)) || cat.slug,
          categoryTitle: (s.categoryId && catTitleById.get(s.categoryId)) || cat.title,
          hasQuestAddons: questGatedIds.has(s.id),
          ...enrichItemUI(s, idx)
        };
      })
    };
  });
});
export const getAllServices = cache(async (): Promise<ServiceItem[]> => {
  const cats = await getServiceCategories();
  return cats.flatMap(c => c.items);
});

export const getServiceBySlug = cache(async (slug: string): Promise<ServiceItem | undefined> => {
  const all = await getAllServices();
  return all.find(s => s.id === slug);
});
