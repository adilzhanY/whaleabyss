"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";
import SuggestServiceModal from "@/components/SuggestServiceModal";
import { useSession } from "next-auth/react";

export default function ServicesClient({ categories }: { categories: any[] }) {
  const { data: session } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

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

        <div className="mx-auto px-4 sm:px-6 relative z-10" style={{ maxWidth: "75rem" }}>
          <div className="mb-12 text-center text-white">
            <h1 className="text-4xl font-black mb-4 text-slate-800" style={{ fontFamily: "var(--font-primary), sans-serif" }}>Все услуги</h1>
            <p className="text-slate-500 max-w-2xl mx-auto">Полный каталог наших услуг для развития аккаунта и сопровождения в Genshin Impact.</p>
          </div>

          <div className="flex flex-col gap-12">
            {categories.map((category) => (
              <div key={category.id} className="flex flex-col gap-6">
                <h3
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-primary), sans-serif", color: "black" }}
                >
                  {category.title}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                  {category.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="w-full h-full"
                    >
                      <ServiceCard item={item} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <button
              onClick={() => setSuggestOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-12 py-5 text-xl font-bold transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none"
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "#ffffff"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(255, 255, 255, 0.1), 0 10px 10px -5px rgba(255, 255, 255, 0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
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
