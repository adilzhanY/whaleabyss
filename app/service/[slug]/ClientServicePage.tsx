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
  const match = desc.match(/([^.]*доступн[оа]?\s+с\s+\d+\s+ранга[^.]*\.?)/i);
  if (match) {
    const originalSentence = match[1];

    let infoText = originalSentence.replace(/\.$/, "").trim();
    if (!infoText.endsWith(".")) infoText += ".";
    // Capitalize first letter
    infoText = infoText.charAt(0).toUpperCase() + infoText.slice(1);

    let mainText = desc.replace(originalSentence, "").trim();
    // Cleanup any stray periods left after removing the sentence
    mainText = mainText.replace(/^\.\s*/, "").replace(/\s*\.\s*$/, ".").replace(/\s+/g, " ");

    return { mainText: mainText, infoPoint: infoText };
  }
  return { mainText: desc, infoPoint: null };
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function ClientServicePage({ service }: ClientServicePageProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const { addToCart, openCart } = useCart();

  // Get today and tomorrow as default dates
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const [startDate, setStartDate] = useState(todayDate.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(tomorrowDate.toISOString().split("T")[0]);

  // Calculate days difference
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const calculatedDays = timeDiff > 0 ? Math.ceil(timeDiff / (1000 * 3600 * 24)) : 1;

  // Use calculatedDays if per day, otherwise default to 1
  const activeDays = service.isPerDay ? calculatedDays : 1;

  const pricePerItem = service.price;
  const totalPrice = pricePerItem * activeDays;

  const handleAdd = () => {
    addToCart({
      id: service.id,
      title: service.title,
      subtitle: service.subtitle,
      price: pricePerItem,
    }, activeDays);
    openCart();
  };

  const currentStartDate = startDate;
  const currentEndDate = endDate;

  const { mainText, infoPoint } = getInfoPoint(service.description);

  return (
    <>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <CartModal />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="mx-auto px-4 pt-24 pb-8 flex flex-col items-center w-full max-w-6xl" style={{ maxWidth: "1200px" }}>
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
                  style={{ fontFamily: "var(--font-primary), sans-serif" }}
                >
                  {service.subtitle || service.title}
                </h1>
                <p className="text-white/90 text-sm sm:text-base font-medium drop-shadow-md">Whale Abyss Premium Service</p>
              </div>
            </div>

            {/* Feature Cards below image */}
            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="font-bold text-slate-800 text-sm">Безопасность</p>
              </div>
            </div>
          </div>

          {/* Details & Checkout Right Column */}
          <div className="w-full lg:sticky lg:top-24 h-max">
            <div className="w-full bg-white rounded-4xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-8 sm:p-10 flex flex-col border border-slate-50">

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
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
                <div
                  className="mb-8 flex items-center gap-4 px-6 py-4 rounded-xl shadow-sm"
                  style={{
                    backgroundColor: "var(--bg-highlight)",
                    borderLeft: "6px solid var(--accent-primary)",
                  }}
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    <span className="font-bold text-sm italic" style={{ fontFamily: "serif" }}>i</span>
                  </div>
                  <span
                    className="font-bold sm:text-lg text-base"
                    style={{
                      fontFamily: "var(--font-primary), sans-serif",
                      color: "var(--text-primary)",
                    }}
                  >
                    {infoPoint}
                  </span>
                </div>
              )}

              {/* Per Day Service Configurator */}
              {service.isPerDay && (
                <div className="mb-6 border-t border-slate-100 pt-6">
                  <label className="text-lg font-bold" style={{ color: "#1e3a8a", fontFamily: "var(--font-primary), sans-serif" }}>
                    Выберите срок обслуживания: {activeDays} дн.
                  </label>
                  <div className="flex flex-col gap-4 mt-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                          Дата начала
                        </label>
                        <input
                          type="date"
                          value={currentStartDate}
                          min={todayDate.toISOString().split("T")[0]}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-700 bg-white shadow-sm text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                          Дата окончания
                        </label>
                        <input
                          type="date"
                          value={currentEndDate}
                          min={currentStartDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-700 bg-white shadow-sm text-sm"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 leading-tight">
                          {activeDays} {activeDays === 1 ? 'день' : activeDays > 1 && activeDays < 5 ? 'дня' : 'дней'}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          По {pricePerItem.toLocaleString("ru-RU")} ₽ за каждый день работы
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Row */}
              <div className="mt-2 border-t border-slate-100 pt-6 flex items-end justify-between mb-6">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {service.isPerDay ? "ИТОГОВАЯ СТОИМОСТЬ" : "СТОИМОСТЬ"}
                  </p>
                  <div className="flex items-baseline gap-1" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
                    <span className="text-4xl font-bold text-slate-800">{totalPrice.toLocaleString("ru-RU")}</span>
                    <span className="text-3xl font-bold text-slate-800">₽</span>
                  </div>
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