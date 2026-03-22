"use client";

import { useState } from "react";
import Header from "@/components/Header";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import { ServiceItem } from "@/lib/services";
import { useCart } from "@/store/useCart";
import { UserCircle } from "lucide-react";
import Link from "next/link";

interface ClientServicePageProps {
  service: ServiceItem;
}

export default function ClientServicePage({ service }: ClientServicePageProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const { addToCart, openCart } = useCart();

  const handleAdd = () => {
    addToCart({
      id: service.id,
      title: service.title,
      subtitle: service.subtitle,
      price: service.price,
    });
    openCart();
  };

  return (
    <>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <CartModal />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="mx-auto px-4 sm:px-6 py-12" style={{ maxWidth: "75rem" }}>
        {/* Breadcrumb / Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#1e3a8a", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
            {service.subtitle}
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column (Banner + Description) */}
          <div className="flex-1 w-full">
            {/* Huge Banner */}
            <div
              className="w-full rounded-3xl overflow-hidden flex items-center justify-center mb-6 relative"
              style={{
                aspectRatio: "16/7",
                background: `url('${service.background || "/images/genshin_background.jpg"}') center/cover`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />
              <h2
                className="text-white relative z-10 font-black italic text-4xl sm:text-6xl text-center px-4"
                style={{
                  fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
                  letterSpacing: "0.02em",
                  textShadow: "2px 2px 0 rgba(0,0,0,0.5), -1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                Зачистка карты
              </h2>
            </div>

            {/* Description Text */}
            <div className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {service.description ? (
                <p>{service.description}</p>
              ) : (
                <p>Производим профессиональную 100% зачистку локации {service.subtitle}. Собираем все доступные сундуки, окулусы и решаем загадки. Зачистка выполняется опытными специалистами с гарантией безопасности вашего аккаунта.</p>
              )}
            </div>
          </div>

          {/* Right Column (Cart adding widget) */}
          <div
            className="w-full lg:w-90 shrink-0 rounded-3xl flex flex-col"
            style={{
              backgroundColor: "#f5f7ff",
              padding: "1rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            {/* Image Placeholder Match ServiceCard */}
            <div
              className="mb-4 w-full flex items-center justify-center relative overflow-hidden"
              style={{
                borderRadius: "1rem",
                aspectRatio: "4/3",
                background: service.gradient || "linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #4f46e5 100%)",
              }}
            >
              <span
                className="text-white text-center z-10"
                style={{
                  fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
                  fontWeight: 900,
                  fontSize: "1.75rem",
                  letterSpacing: "0.05em",
                  textShadow: "2px 2px 0 rgba(0,0,0,0.5), -1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5)",
                  padding: "0 10px"
                }}
              >
                {service.title}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-base font-medium" style={{ color: "#334155" }}>
                {service.subtitle}
              </p>
            </div>

            <div className="mb-6">
              <span
                className="text-2xl font-bold"
                style={{ color: "#1e3a8a", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
              >
                {service.price.toLocaleString("ru-RU")} ₽
              </span>
            </div>

            <button
              onClick={handleAdd}
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-colors"
              style={{
                backgroundColor: "#1e3a8a",
                boxShadow: "0 4px 12px rgba(30,58,138,0.2)"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#172554")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1e3a8a")}
            >
              Добавить в корзину
            </button>

            <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center justify-center gap-2 text-xs font-medium text-slate-600">
              <UserCircle className="w-4 h-4" />
              <span>Доставка через учетную запись</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}