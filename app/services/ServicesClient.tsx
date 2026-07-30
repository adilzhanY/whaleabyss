"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";
import SuggestServiceModal from "@/components/SuggestServiceModal";
import Breadcrumb from "@/components/Breadcrumb";
import CustomSearchField from "@/components/CustomSearchField";
import CustomSelect from "@/components/CustomSelect";
import { Flame, FilterX } from "lucide-react";
import valleSad from "@/public/images/valle_chibi_sad.png";
import type { ServiceCategory, ServiceItem } from "@/lib/services";

type SortKey = "default" | "price-asc" | "price-desc" | "name";

/**
 * Price filter as four buckets rather than a slider.
 *
 * The catalog is heavily skewed: of 102 public services the median is 600 ₽,
 * two thirds cost under 1000 ₽ and only a handful clear 3000 ₽, so a linear
 * 100 ₽-step slider would put most of the catalog inside the first ~14% of its
 * travel and leave the rest of the track empty. Buckets are one tap and show
 * their counts up front.
 */
const PRICE_BUCKETS: { key: string; label: string; test: (p: number) => boolean }[] = [
  { key: "lt500", label: "до 500 ₽", test: (p) => p <= 500 },
  { key: "500-1500", label: "500–1500 ₽", test: (p) => p > 500 && p <= 1500 },
  { key: "1500-3000", label: "1500–3000 ₽", test: (p) => p > 1500 && p <= 3000 },
  { key: "gt3000", label: "дороже 3000 ₽", test: (p) => p > 3000 },
];

const SORT_LABELS: Record<SortKey, string> = {
  "default": "По умолчанию",
  "price-asc": "Сначала дешевле",
  "price-desc": "Сначала дороже",
  "name": "По названию",
};

/**
 * Column caps for a section, so a category with one or two services doesn't
 * render as a five-column row that is four-fifths empty — which is exactly what
 * «Актуальное» (1 service) used to do at the very top of the catalog.
 * Tailwind needs static class names, hence the lookup.
 */
function gridClassFor(count: number): string {
  if (count === 1) return "grid-cols-1 max-w-[240px]";
  if (count === 2) return "grid-cols-2 max-w-[510px]";
  if (count === 3) return "grid-cols-2 sm:grid-cols-3 max-w-[780px]";
  if (count === 4) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-[1040px]";
  return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
}

export default function ServicesClient({
  categories,
  bestsellerSlugs = [],
}: {
  categories: ServiceCategory[];
  bestsellerSlugs?: string[];
}) {
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [authOpen, setAuthOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  /**
   * Filters are mirrored into the query string so a filtered catalog is a
   * shareable link and the back button restores the view.
   *
   * The URL is written with `history.replaceState`, not `router.replace`:
   * every service is already on the client, so filtering must not trigger an
   * RSC round-trip (which re-runs the catalog's DB queries for a purely
   * client-side operation). `router.replace` also refused to update the URL at
   * all from these handlers — see the note on `dynamic` in page.tsx.
   *
   * State is therefore the source of truth and the URL follows it; the initial
   * value is seeded from the URL, and `popstate` feeds browser navigation back.
   */
  const [filters, setFilters] = useState(() => ({
    cat: searchParams.get("cat") ?? "all",
    sort: (searchParams.get("sort") ?? "default") as SortKey,
    price: searchParams.get("price") ?? "all",
    q: searchParams.get("q") ?? "",
  }));

  const { cat: activeCat, sort, price: priceKey, q: query } = filters;

  const setParams = useCallback((updates: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  // The URL is written in an effect, never inside the state updater: React may
  // re-run an updater during rendering, and `history.replaceState` reaches into
  // the Router — doing it there logs "Cannot update a component (Router) while
  // rendering a different component".
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.cat !== "all") params.set("cat", filters.cat);
    if (filters.sort !== "default") params.set("sort", filters.sort);
    if (filters.price !== "all") params.set("price", filters.price);
    if (filters.q.trim()) params.set("q", filters.q.trim());
    const qs = params.toString();
    const next = qs ? `/services?${qs}` : "/services";
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", next);
    }
  }, [filters]);

  // The search box holds its own value while typing and is folded into the
  // filters on a debounce, so a keystroke doesn't rewrite the URL.
  const [searchInput, setSearchInput] = useState(query);

  // Back/forward must move through the filter states the user actually saw.
  // Both pieces of state are set here, in the event callback, so no effect has
  // to mirror one into the other.
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const q = p.get("q") ?? "";
      setFilters({
        cat: p.get("cat") ?? "all",
        sort: (p.get("sort") ?? "default") as SortKey,
        price: p.get("price") ?? "all",
        q,
      });
      setSearchInput(q);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput === query) return;
      setParams({ q: searchInput });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, query, setParams]);

  const priceTest = useMemo(
    () => PRICE_BUCKETS.find((b) => b.key === priceKey)?.test ?? (() => true),
    [priceKey]
  );

  // Sections ordered biggest-first: «Задания» (62) and «Исследование регионов»
  // (24) are 84% of the catalog but used to sit below sections of 1–5 items.
  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => b.items.length - a.items.length),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderedCategories
      .filter((c) => activeCat === "all" || c.slug === activeCat)
      .map((category) => {
        let items = category.items.filter((item) => priceTest(item.price));
        if (q) {
          items = items.filter(
            (item) =>
              item.title?.toLowerCase().includes(q) ||
              item.subtitle?.toLowerCase().includes(q)
          );
        }
        if (sort === "price-asc") items.sort((a, b) => a.price - b.price);
        else if (sort === "price-desc") items.sort((a, b) => b.price - a.price);
        else if (sort === "name")
          items.sort((a, b) =>
            (a.subtitle || a.title).localeCompare(b.subtitle || b.title, "ru")
          );
        return { ...category, items };
      })
      .filter((category) => category.items.length > 0);
  }, [query, orderedCategories, activeCat, sort, priceTest]);

  const catCounts = useMemo(
    () => orderedCategories.map((c) => ({ slug: c.slug, title: c.title, n: c.items.length })),
    [orderedCategories]
  );
  const grandTotal = useMemo(
    () => categories.reduce((sum, c) => sum + c.items.length, 0),
    [categories]
  );

  // Bucket counts come from the same rendered set the chips filter, so a chip
  // never promises a number the grid can't show.
  const priceCounts = useMemo(() => {
    const all = categories.flatMap((c) => c.items);
    const counts: Record<string, number> = {};
    for (const bucket of PRICE_BUCKETS) {
      counts[bucket.key] = all.filter((i) => bucket.test(i.price)).length;
    }
    return counts;
  }, [categories]);

  const bestsellerSet = useMemo(() => new Set(bestsellerSlugs), [bestsellerSlugs]);

  // The rail keeps the order-count ranking and de-duplicates services that also
  // appear under «Актуальное».
  const bestsellers = useMemo(() => {
    const byId = new Map<string, ServiceItem>();
    for (const category of categories) {
      for (const item of category.items) if (!byId.has(item.id)) byId.set(item.id, item);
    }
    return bestsellerSlugs
      .map((slug) => byId.get(slug))
      .filter((item): item is ServiceItem => Boolean(item))
      .slice(0, 5);
  }, [categories, bestsellerSlugs]);

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const isFiltered = activeCat !== "all" || priceKey !== "all" || query.trim() !== "" || sort !== "default";
  const resetAll = () => {
    // Clear the box too, or the debounce below would write the old query back.
    setSearchInput("");
    setParams({ cat: "all", price: "all", q: "", sort: "default" });
  };

  // Jumping to the results after a category change: on a long catalog the grid
  // otherwise changes silently below the fold.
  const selectCategory = (slug: string) => {
    setParams({ cat: slug });
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <SuggestServiceModal isOpen={suggestOpen} onClose={() => setSuggestOpen(false)} />

      <section id="services" className="pt-24 pb-20 relative" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="site-container relative z-10">
          <Breadcrumb />

          {/* Compact header: the title block used to push the first card almost
              entirely below the fold. */}
          <div className="mb-5">
            <h1
              className="text-3xl sm:text-4xl font-black text-blue-950 mb-1.5"
              style={{ fontFamily: "var(--font-primary), sans-serif" }}
            >
              Все услуги
            </h1>
            <p className="text-base text-slate-600" style={{ maxWidth: "58ch", textWrap: "pretty" }}>
              Полный каталог услуг для развития аккаунта и сопровождения в Genshin Impact.
            </p>
          </div>

          {/* Bestsellers: real ranking by number of paid orders. Gives the first
              screen something curated instead of the smallest category. */}
          {bestsellers.length > 0 && !isFiltered && (
            <div className="mb-7">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                <Flame className="h-5 w-5 text-orange-500" strokeWidth={2.2} />
                Чаще всего заказывают
              </h2>
              <div className={`grid gap-3 sm:gap-6 ${gridClassFor(bestsellers.length)}`}>
                {bestsellers.map((item) => (
                  <div key={`best-${item.id}`} className="w-full h-full">
                    <ServiceCard item={item} categorySlug={item.categorySlug} isBestseller />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sticky so the filters stay reachable through a 100+ card catalog. */}
          <div
            className="sticky top-20 z-30 -mx-4 mb-5 border-b border-slate-200 px-4 pb-3 pt-3 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.4)] backdrop-blur-md sm:-mx-6 sm:px-6"
            style={{ backgroundColor: "color-mix(in srgb, var(--bg-main) 96%, transparent)" }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <CustomSearchField
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Поиск по названию услуги..."
                fieldSize="md"
                className="w-full sm:max-w-md"
              />
              <div className="sm:ml-auto flex items-center gap-2 text-sm text-slate-500">
                <span className="whitespace-nowrap">Сортировка</span>
                <CustomSelect
                  value={sort}
                  onChange={(v) => setParams({ sort: v as SortKey })}
                  ariaLabel="Сортировка"
                  fieldSize="md"
                  className="w-52"
                  options={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({
                    value: k,
                    label: SORT_LABELS[k],
                  }))}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => selectCategory("all")}
                aria-pressed={activeCat === "all"}
                className={activeCat === "all" ? "btn-primary btn-sm" : "btn-outline btn-sm"}
              >
                Все
                <span className="opacity-60">{grandTotal}</span>
              </button>
              {catCounts.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => selectCategory(c.slug)}
                  aria-pressed={activeCat === c.slug}
                  className={activeCat === c.slug ? "btn-primary btn-sm" : "btn-outline btn-sm"}
                >
                  {c.title}
                  <span className="opacity-60">{c.n}</span>
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold text-slate-400">Цена</span>
              <button
                onClick={() => setParams({ price: "all" })}
                aria-pressed={priceKey === "all"}
                className={priceKey === "all" ? "btn-primary btn-sm" : "btn-outline btn-sm"}
              >
                Любая
              </button>
              {PRICE_BUCKETS.map((bucket) => (
                <button
                  key={bucket.key}
                  onClick={() => setParams({ price: bucket.key })}
                  aria-pressed={priceKey === bucket.key}
                  className={priceKey === bucket.key ? "btn-primary btn-sm" : "btn-outline btn-sm"}
                >
                  {bucket.label}
                  <span className="opacity-60">{priceCounts[bucket.key]}</span>
                </button>
              ))}
            </div>
          </div>

          <div ref={resultsRef} className="mb-6 flex flex-wrap items-center gap-3 scroll-mt-44">
            <p className="text-sm text-slate-500">
              {totalResults > 0 ? `Показано услуг: ${totalResults}` : "Ничего не найдено"}
            </p>
            {isFiltered && (
              <button onClick={resetAll} className="btn-ghost btn-sm !text-[#0B5191]">
                <FilterX className="h-3.5 w-3.5" />
                Сбросить фильтры
              </button>
            )}
          </div>

          {totalResults === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center">
              <Image src={valleSad} alt="" className="h-auto w-[92px] opacity-85" />
              <div>
                <p className="text-base font-bold text-blue-950">Ничего не нашлось</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Попробуйте другой запрос или снимите часть фильтров — возможно, услуга
                  есть в другой категории или ценовом диапазоне.
                </p>
              </div>
              <button onClick={resetAll} className="btn-primary btn-sm">
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {filteredCategories.map((category) => (
                <div key={category.id} className="flex flex-col gap-6 scroll-mt-44" id={category.slug}>
                  <h3
                    className="text-2xl font-bold flex items-baseline gap-2"
                    style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
                  >
                    {category.title}
                    <span className="text-sm font-medium text-slate-400">{category.items.length}</span>
                  </h3>
                  <div className={`grid gap-3 sm:gap-6 ${gridClassFor(category.items.length)}`}>
                    {category.items.map((item: ServiceItem) => (
                      <div key={item.id} className="w-full h-full">
                        <ServiceCard
                          item={item}
                          categorySlug={category.slug}
                          isBestseller={bestsellerSet.has(item.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-16 flex justify-center">
            <button
              onClick={() => setSuggestOpen(true)}
              className="btn-primary inline-flex items-center justify-center gap-2 !px-12 !py-5 !text-xl !font-bold"
            >
              Предложить услугу
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
