"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import { ServiceItem } from "@/lib/services";
import { useCart } from "@/store/useCart";
import { UserCircle, Tag, Layers, CheckCircle, Info, ShoppingCart, Gauge, Shield, MonitorPlay } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ClientServicePageProps {
  service: ServiceItem;
}

function getInfoPoint(desc: string | undefined) {
  if (!desc) return { mainText: "", infoPoint: null };
  const match = desc.match(/(?:Зачистка доступна|Услуга доступна|Выполняется)\s+(с\s+\d+\s+ранга[^.]*)/i);
  if (match) {
    const fullSentence = match[0];
    const infoPoint = match[1];
    const mainText = desc
      .replace(new RegExp(`\\.?\\s*` + escapeRegex(fullSentence) + `\\.?`, 'i'), '.')
      .replace(new RegExp(escapeRegex(fullSentence) + `\\.?`, 'i'), '')
      .trim();
    return { mainText: mainText.replace(/^\. /, ''), infoPoint: infoPoint.trim() };
  }
  return { mainText: desc, infoPoint: null };
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  if (service.isPerDay) {
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

  // --- STANDARD SERVICE LAYOUT ---
  const { mainText, infoPoint } = getInfoPoint(service.description);

  return (
    <>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <CartModal />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="mx-auto px-4 py-8 flex flex-col items-center w-full max-w-6xl" style={{ maxWidth: "1200px" }}>
        <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6 xl:gap-8 items-start">

          {/* Main Visual & Details Column */}
          <div className="flex flex-col gap-6 w-full">
            {/* Wider Hero Image with title overlaid at bottom */}
            <div
              className="w-full rounded-4xl overflow-hidden relative shadow-sm"
              style={{
                aspectRatio: "16/10",
                background: `url('${service.background || "/images/genshin_background.jpg"}') center/cover no-repeat`,
              }}
            >
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-8 sm:p-10">
                <h1
                  className="text-white font-bold text-3xl sm:text-4xl md:text-5xl drop-shadow-md mb-2"
                  style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                >
                  {service.subtitle || service.title}
                </h1>
                <p className="text-white/90 text-sm sm:text-base font-medium drop-shadow-md">Whale Abyss Premium Service</p>
              </div>
            </div>

            {/* Feature Cards below image */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 text-blue-800 shadow-sm border border-blue-100">
                  <Gauge className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800 text-sm">Быстрое выполнение</p>
              </div>
              {/* Card 2 */}
              <div className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 text-blue-800 shadow-sm border border-blue-100">
                  <Shield className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800 text-sm">Безопасность (VPN)</p>
              </div>
              {/* Card 3 */}
              <div className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 text-blue-800 shadow-sm border border-blue-100">
                  <MonitorPlay className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800 text-sm">Стрим (по запросу)</p>
              </div>
            </div>
          </div>

          {/* Details & Checkout Right Column */}
          <div className="w-full lg:sticky lg:top-24 h-max">
            <div className="w-full bg-white rounded-4xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-8 sm:p-10 flex flex-col border border-slate-50">

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Детали Услуги
              </h2>

              <div className="text-slate-600 leading-relaxed text-sm sm:text-base mb-6 space-y-4">
                {mainText ? (
                  <p>{mainText}</p>
                ) : (
                  <p>В данную услугу входит профессиональное выполнение "{service.subtitle}". Наши опытные специалисты обеспечат быстрый и качественный результат с гарантией безопасности аккаунта.</p>
                )}
              </div>

              {infoPoint && (
                <div className="mb-8 flex items-center gap-3 bg-blue-50 text-blue-900 px-5 py-4 rounded-2xl border border-blue-100">
                  <div className="bg-blue-800 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">Доступно {infoPoint}</span>
                </div>
              )}

              {/* Price Row */}
              <div className="mt-2 border-t border-slate-100 pt-8 flex items-end justify-between mb-6">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">СТОИМОСТЬ</p>
                  <div className="flex items-baseline gap-1" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                    <span className="text-4xl font-bold text-slate-800">{totalPrice.toLocaleString("ru-RU")}</span>
                    <span className="text-3xl font-bold text-slate-800">₽</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-[11px] font-bold text-slate-400">Примерное время</p>
                  <p className="text-sm font-bold text-blue-800">24-48 часов</p>
                </div>
              </div>

              <button
                onClick={handleAdd}
                className="w-full px-6 py-4 rounded-xl text-white font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:opacity-90 mt-2"
                style={{
                  backgroundColor: "#1e3a8a",
                  boxShadow: "0 8px 24px rgba(30,58,138,0.25)"
                }}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Добавить в корзину</span>
              </button>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}