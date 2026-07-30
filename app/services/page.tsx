import { getServiceCategories } from "@/lib/services";
import { getBestsellerSlugs } from "@/lib/bestsellers";
import ServicesClient from "./ServicesClient";
import { generateMetadata as genMeta } from "@/lib/seo";

/**
 * Rendered per request: the catalog and the bestseller ranking are both live DB
 * reads, and the client reads its initial filter state out of the query string
 * with `useSearchParams` — which on a prerendered route would need its own
 * Suspense boundary and a client-side bailout.
 */
export const dynamic = "force-dynamic";

export const metadata = genMeta({
  title: "Услуги прокачки Genshin Impact",
  description: "Полный каталог услуг по прокачке аккаунтов Genshin Impact: прохождение Спиральной Бездны, фарм ресурсов, прокачка персонажей, выполнение квестов. Профессиональные бустеры, безопасно и быстро.",
  keywords: "услуги прокачки genshin, буст genshin impact, прохождение бездны, фарм примогемов, прокачка персонажей, каталог услуг genshin",
  canonical: "https://whaleabyss.ru/services",
});

export default async function ServicesPage() {
  const [categories, bestsellerSlugs] = await Promise.all([
    getServiceCategories(),
    getBestsellerSlugs(10),
  ]);

  return <ServicesClient categories={categories} bestsellerSlugs={bestsellerSlugs} />;
}
