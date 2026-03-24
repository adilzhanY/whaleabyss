"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

      <main className="mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center" style={{ maxWidth: "75rem" }}>
        {/* Breadcrumb / Title */}
        <div className="mb-4 w-full text-center">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#1e3a8a", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
            {service.subtitle}
          </h1>
        </div>

        <div className="flex flex-col items-center w-full max-w-4xl gap-6">
          {/* Huge Banner */}
          <div
            className={`w-full rounded-3xl overflow-hidden flex items-center justify-center relative ${(service.isTall || service.isSquare) ? "max-w-md mx-auto" : ""}`}
            style={{
              maxHeight: (service.isTall || service.isExtraTall || service.isSquare) ? "none" : "280px",
              aspectRatio: service.isSquare ? "1/1" : service.isExtraTall ? "380/712" : service.isTall ? "380/632" : "16/7",
              background: `url('${service.background || "/images/genshin_background.jpg"}') center/cover`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />
            <h2
              className="text-white relative z-10 font-black text-4xl sm:text-5xl text-center px-4"
              style={{
                fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
                letterSpacing: "0.05em",
                textShadow: "2px 2px 0 rgba(0,0,0,0.5), -1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              {service.title}
            </h2>
          </div>

          {/* Details Block */}
          <div
            className="w-full max-w-4xl rounded-3xl flex flex-col justify-center"
            style={{
              backgroundColor: "#f5f7ff",
              padding: "2rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <div className="mb-4">
              <p className="text-xl font-bold" style={{ color: "#334155", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                {service.subtitle}
              </p>
            </div>

            {/* Description Text */}
            <div className="text-sm sm:text-base leading-relaxed text-left mb-8" style={{ color: "var(--text-primary)" }}>
              {service.description ? (
                <p>{service.description}</p>
              ) : (
                <p>Производим профессиональную 100% зачистку локации {service.subtitle}. Собираем все доступные сундуки, окулусы и решаем загадки. Зачистка выполняется опытными специалистами с гарантией безопасности вашего аккаунта.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-4 border-t border-blue-100 pt-6">
              <span
                className="text-4xl font-bold"
                style={{ color: "#1e3a8a", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
              >
                {service.price.toLocaleString("ru-RU")} ₽
              </span>

              <button
                onClick={handleAdd}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-white font-bold text-base transition-colors"
                style={{
                  backgroundColor: "#1e3a8a",
                  boxShadow: "0 4px 12px rgba(30,58,138,0.2)"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#172554")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1e3a8a")}
              >
                Добавить в корзину
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}