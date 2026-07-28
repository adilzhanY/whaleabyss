"use client";

import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";
import SuggestServiceModal from "@/components/SuggestServiceModal";
import { Search, X } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import Input from "@/components/Input";

export default function ServicesClient({ categories }: { categories: any[] }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // The page was a 6000px wall of scroll with no way to navigate it: search
  // only, no filter, no sort, no counts. These two pieces of state drive the
  // category rail and the ordering control below.
  const [activeCat, setActiveCat] = useState<string>("all");
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "name">("default");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search matches the visible name too — users type what they can see
  // ("Нод-Край"), which lives in `subtitle`, not only in `title`.
  const filteredCategories = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return categories
      .filter((c) => activeCat === "all" || c.slug === activeCat)
      .map((category) => {
        let items = query
          ? category.items.filter(
              (item: any) =>
                item.title?.toLowerCase().includes(query) ||
                item.subtitle?.toLowerCase().includes(query)
            )
          : [...category.items];
        if (sort === "price-asc") items.sort((a: any, b: any) => a.price - b.price);
        else if (sort === "price-desc") items.sort((a: any, b: any) => b.price - a.price);
        else if (sort === "name")
          items.sort((a: any, b: any) =>
            (a.subtitle || a.title).localeCompare(b.subtitle || b.title, "ru")
          );
        return { ...category, items };
      })
      .filter((category) => category.items.length > 0);
  }, [debouncedSearch, categories, activeCat, sort]);

  const catCounts = useMemo(
    () =>
      categories.map((c) => ({
        slug: c.slug,
        title: c.title,
        n: c.items.length,
      })),
    [categories]
  );
  const grandTotal = useMemo(
    () => categories.reduce((sum, c) => sum + c.items.length, 0),
    [categories]
  );

  const totalResults = filteredCategories.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <SuggestServiceModal isOpen={suggestOpen} onClose={() => setSuggestOpen(false)} />

      <section
        id="services"
        className="pt-24 pb-20 relative overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #090e17 0%, #111a2e 100%)",
          minHeight: "calc(100vh - 64px)"
        }}
      >
        {/* One ground, one surface. The graph-paper grid used to sit under
            bordered + shadowed cards on near-white; the background grid fought
            the content grid and everything read washed out. Plain ground now —
            the cards carry the structure. */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundColor: "var(--bg-main)" }}>
          <div className="services-fog absolute inset-0 opacity-40" />
        </div>

        <div className="site-container relative z-10">
          <Breadcrumb />
          {/* Left-aligned to match the section headings and the grid below —
              the centred title/search used to float on a different axis. */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-black text-blue-950 mb-3" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
              Все услуги
            </h1>
            <p className="text-lg text-slate-600" style={{ maxWidth: "58ch", textWrap: "pretty" }}>
              Полный каталог наших услуг для развития аккаунта и сопровождения в Genshin Impact.
            </p>
          </div>

          {/* Controls: search + sort + a category rail with counts. Previously
              the only way through 100+ services was scrolling. */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию услуги..."
                className="pl-12 pr-10 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Очистить поиск"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <label className="sm:ml-auto flex items-center gap-2 text-sm text-slate-500">
              <span className="whitespace-nowrap">Сортировка</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="input-field !py-2 !px-3 !text-sm !w-auto"
              >
                <option value="default">По умолчанию</option>
                <option value="price-asc">Сначала дешевле</option>
                <option value="price-desc">Сначала дороже</option>
                <option value="name">По названию</option>
              </select>
            </label>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCat("all")}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCat === "all"
                  ? "border-transparent bg-[var(--accent-primary)] text-white"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              Все <span className="opacity-60">{grandTotal}</span>
            </button>
            {catCounts.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveCat(c.slug)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeCat === c.slug
                    ? "border-transparent bg-[var(--accent-primary)] text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {c.title} <span className="opacity-60">{c.n}</span>
              </button>
            ))}
          </div>

          <p className="mb-8 text-sm text-slate-500">
            {totalResults > 0
              ? `Показано услуг: ${totalResults}`
              : "Ничего не найдено. Попробуйте изменить запрос или сбросить фильтр."}
          </p>

          <div className="flex flex-col gap-12">
            {filteredCategories.map((category) => (
              <div key={category.id} className="flex flex-col gap-6" id={category.slug}>
                <h3
                  className="text-2xl font-bold flex items-baseline gap-2"
                  style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
                >
                  {category.title}
                  <span className="text-sm font-medium text-slate-400">{category.items.length}</span>
                </h3>
                {/* Every section uses the same 5-up grid. "Актуальное" used to
                    be a 1-2 column layout, so a single item rendered as one
                    lonely half-width card that looked like a failed load. */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                  {category.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="w-full h-full"
                    >
                      <ServiceCard item={item} categorySlug={category.slug} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

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
