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
  const [days, setDays] = useState(1);

  const pricePerDay = service.isPerDay ? service.price : null;
  const totalPrice = pricePerDay ? pricePerDay * days : service.price;

  const handleAdd = () => {
    addToCart({
      id: service.id,
      title: service.title,
      subtitle: service.isPerDay ? `${service.subtitle} (${days} дн.)` : service.subtitle,
      price: totalPrice,
    });
    openCart();
  };

  const quickOptions = [
    { label: "1 день", value: 1 },
    { label: "3 дня", value: 3 },
    { label: "1 неделя", value: 7 },
    { label: "2 недели", value: 14 },
    { label: "1 месяц", value: 30 },
    { label: "3 месяца", value: 90 },
    { label: "6 месяцев", value: 180 },
    { label: "Год", value: 365 }
  ];

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

        <div className="flex flex-col md:flex-row w-full max-w-5xl gap-6 md:gap-8 items-start">
          {/* Column 1: Image & Description */}
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <div
              className="w-full rounded-3xl overflow-hidden flex items-center justify-center relative shadow-lg"
              style={{
                aspectRatio: "1/1",
                background: `url('${service.background || "/images/genshin_background.jpg"}') center/cover no-repeat`,
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />
              <h2
                className="text-white relative z-10 font-black text-3xl sm:text-4xl text-center px-4"
                style={{
                  fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
                  letterSpacing: "0.05em",
                  textShadow: "2px 2px 0 rgba(0,0,0,0.5), -1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                {service.title}
              </h2>
            </div>

            <div
              className="w-full rounded-3xl flex flex-col justify-center"
              style={{
                backgroundColor: "#f5f7ff",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <h3 className="text-xl font-bold mb-3" style={{ color: "#334155", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Описание
              </h3>
              <div className="text-sm sm:text-base leading-relaxed text-left" style={{ color: "var(--text-primary)" }}>
                {service.description ? (
                  <p>{service.description}</p>
                ) : (
                  <p>Производим профессиональную 100% зачистку локации {service.subtitle}. Собираем все доступные сундуки, окулусы и решаем загадки. Зачистка выполняется опытными специалистами с гарантией безопасности вашего аккаунта.</p>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Calculator & Actions */}
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <div
              className="w-full rounded-3xl flex flex-col justify-center"
              style={{
                backgroundColor: "#f5f7ff",
                padding: "2rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <div className="mb-6">
                <p className="text-2xl font-bold" style={{ color: "#334155", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  {service.subtitle}
                </p>
              </div>

              {service.isPerDay && (
                <div className="mb-8 w-full border-b border-blue-100 pb-6">
                  <div className="mb-4">
                    <label className="text-lg font-bold" style={{ color: "#1e3a8a", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                      Количество дней: {days} дн.
                    </label>
                    <p className="text-sm text-slate-500 mb-4 mt-1">Выберите срок обслуживания аккаунта</p>
                    <input
                      type="range"
                      min="1"
                      max="365"
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-700"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {quickOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDays(opt.value)}
                        className="px-3 py-1.5 text-sm font-semibold rounded-xl transition-colors border"
                        style={{
                          backgroundColor: days === opt.value ? "#1e3a8a" : "transparent",
                          color: days === opt.value ? "white" : "#1e3a8a",
                          borderColor: "#1e3a8a"
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Итоговая стоимость:</p>
                  <span
                    className="text-4xl font-bold block"
                    style={{ color: "#1e3a8a", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                  >
                    {totalPrice.toLocaleString("ru-RU")} ₽
                  </span>
                </div>

                <button
                  onClick={handleAdd}
                  className="w-full px-8 py-4 rounded-xl text-white font-bold text-lg transition-colors"
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
        </div>
      </main>
      <Footer />
    </>
  );
}