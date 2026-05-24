"use client";

import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";
import SuggestServiceModal from "@/components/SuggestServiceModal";
import { Search } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export default function ServicesClient({ categories }: { categories: any[] }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return categories;
    }

    const query = debouncedSearch.toLowerCase();

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item: any) =>
          item.title?.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [debouncedSearch, categories]);

  const totalResults = filteredCategories.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <CartModal />
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
        <div className="absolute inset-0 pointer-events-none z-0 bg-white">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(circle at 0% 0%, rgba(220, 235, 255, 0.5) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(200, 225, 250, 0.4) 0%, transparent 50%)`,
              filter: "blur(40px)"
            }}
          />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tech-grid" width="64" height="64" patternUnits="userSpaceOnUse">
                <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#334155" strokeWidth="1" opacity="0.08" />
                <path d="M -4 0 L 4 0 M 0 -4 L 0 4" fill="none" stroke="#334155" strokeWidth="2" opacity="0.15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tech-grid)" />
          </svg>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
          <Breadcrumb />
          <div className="mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl font-black text-blue-950 mb-4" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
              Все услуги
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">Полный каталог наших услуг для развития аккаунта и сопровождения в Genshin Impact.</p>
          </div>

          <div className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию услуги..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {debouncedSearch && (
            <div className="mb-8 text-center">
              <p className="text-slate-600 text-sm">
                {totalResults > 0
                  ? `Найдено услуг: ${totalResults}`
                  : "Ничего не найдено. Попробуйте изменить запрос."}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-12">
            {filteredCategories.map((category) => (
              <div key={category.id} className="flex flex-col gap-6" id={category.slug}>
                <h3
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-primary), sans-serif", color: "black" }}
                >
                  {category.title}
                </h3>
                <div
                  className={
                    category.slug === "actual"
                      ? "grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6"
                      : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6"
                  }
                >
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
              className="btn-primary inline-flex items-center justify-center gap-2 !rounded-2xl !px-12 !py-5 !text-xl !font-bold"
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
