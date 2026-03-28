"use client";

import { useState } from "react";
import { MousePointerClick, CreditCard, Trophy, Star, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";
import SuggestServiceModal from "@/components/SuggestServiceModal";

// ── Service data ──────────────────────────────────────────────────────────
import { SERVICE_CATEGORIES } from "@/lib/services";

// ── How-it-works steps ───────────────────────────────────────────────────────
const STEPS = [
  {
    icon: <MousePointerClick className="h-7 w-7" />,
    number: "01",
    title: "Выбираете услугу",
    desc: "Просмотрите каталог и добавьте нужную услугу в корзину одним кликом.",
  },
  {
    icon: <CreditCard className="h-7 w-7" />,
    number: "02",
    title: "Оплачиваете",
    desc: "Безопасная оплата онлайн. Принимаем карты, СБП и электронные кошельки.",
  },
  {
    icon: <Trophy className="h-7 w-7" />,
    number: "03",
    title: "Получаете результат",
    desc: "Наши бустеры выполняют заказ быстро и конфиденциально. Уведомим вас о готовности.",
  },
];

// ── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Алексей К.",
    avatar: "АК",
    text: "Заказал прокачку Мондштадта — всё сделали за 2 часа. Никаких проблем с аккаунтом. Рекомендую!",
    rating: 5,
    service: "Мондштадт 100%",
  },
  {
    name: "Мария П.",
    avatar: "МП",
    text: "Брала буст Инадзумы и Энканомии. Ребята профессионалы, оперативно и аккуратно. Уже второй раз покупаю.",
    rating: 5,
    service: "Инадзума и Энканомия 100%",
  },
  {
    name: "Дмитрий В.",
    avatar: "ДВ",
    text: "Отличный сервис! Цена адекватная, поддержка отвечает быстро. Ли Юэ прошли без единого бана.",
    rating: 5,
    service: "Ли Юэ 100%",
  },
];

// ── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <CartModal />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <SuggestServiceModal isOpen={suggestOpen} onClose={() => setSuggestOpen(false)} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative overflow-hidden py-24 sm:py-32"
        style={{
          backgroundImage: "url('/images/genshin_background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Semi-transparent dark + orange overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.72) 0%, rgba(120,53,15,0.60) 50%, rgba(30,58,138,0.45) 100%)",
          }}
        />

        <div className="relative mx-auto px-4 sm:px-6 text-center" style={{ maxWidth: "75rem" }}>
          <span
            className="mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: "rgba(30,58,138,0.25)", color: "#93c5fd", border: "1px solid rgba(30,58,138,0.4)" }}
          >
            #1 Буст-сервис Genshin Impact
          </span>
          <h1
            className="mx-auto mb-6 max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl"
            style={{
              fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
              color: "#ffffff",
            }}
          >
            Профессиональный буст аккаунтов
            Genshin Impact
          </h1>
          <p
            className="mx-auto mb-10 max-w-xl text-base sm:text-lg leading-relaxed"
            style={{ color: "#e2e8f0" }}
          >
            Быстро, безопасно и с гарантией результата. Опытные игроки прокачают
            ваш аккаунт, пока вы занимаетесь другими делами.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#services"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg hover:shadow-white/20"
              style={{ color: "var(--accent-primary)" }}
            >
              Выбрать услугу
            </a>
            <div className="flex items-center gap-6 text-xs font-medium" style={{ color: "#cbd5e1" }}>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                500+ заказов
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                0 банов
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Гарантия возврата
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how" className="py-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
          <div className="mb-12 text-center">
            <h2
              className="text-3xl font-black"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              Как это работает
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Три простых шага до результата
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl p-6"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--accent-border)",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <span
                  className="absolute right-5 top-5 text-4xl font-black opacity-10"
                  style={{ color: "var(--accent-primary)", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                >
                  {step.number}
                </span>
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--bg-highlight)", color: "var(--accent-primary)" }}
                >
                  {step.icon}
                </div>
                <h3
                  className="mb-2 text-base font-bold"
                  style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES GRID ─────────────────────────────────────────────── */}
      <section
        id="services"
        className="py-20 relative overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #090e17 0%, #111a2e 100%)",
        }}
      >
        {/* CSS/SVG Starry Nebula Background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Nebula clouds */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background: `
                radial-gradient(circle at 15% 75%, rgba(45, 120, 160, 0.3) 0%, transparent 35%),
                radial-gradient(circle at 85% 25%, rgba(60, 90, 140, 0.3) 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, rgba(20, 40, 70, 0.4) 0%, transparent 60%)
              `,
              filter: "blur(40px)"
            }}
          />
          {/* Stars overlay */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="star-pattern" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
                <circle cx="25" cy="45" r="1" fill="#ffffff" opacity="0.8" />
                <circle cx="85" cy="115" r="1.5" fill="#fdf8ff" opacity="0.9" filter="drop-shadow(0 0 2px #fff)" />
                <circle cx="150" cy="20" r="0.8" fill="#ffffff" opacity="0.5" />
                <circle cx="210" cy="80" r="2" fill="#ffe0b2" opacity="0.8" filter="drop-shadow(0 0 3px #ffe0b2)" />
                <circle cx="265" cy="190" r="1" fill="#ffffff" opacity="0.7" />
                <circle cx="45" cy="225" r="1.2" fill="#ffffff" opacity="0.6" />
                <circle cx="120" cy="275" r="0.8" fill="#ffffff" opacity="0.4" />
                <circle cx="185" cy="165" r="1.8" fill="#e0f7fa" opacity="0.9" filter="drop-shadow(0 0 2px #e0f7fa)" />
                <circle cx="280" cy="40" r="0.5" fill="#ffffff" opacity="0.5" />
                <circle cx="70" cy="180" r="0.5" fill="#ffffff" opacity="0.6" />
                {/* Tiny background stars */}
                <circle cx="10" cy="10" r="0.3" fill="#ffffff" opacity="0.3" />
                <circle cx="130" cy="130" r="0.4" fill="#ffffff" opacity="0.4" />
                <circle cx="240" cy="240" r="0.3" fill="#ffffff" opacity="0.3" />
                <circle cx="190" cy="290" r="0.4" fill="#ffffff" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#star-pattern)" />
          </svg>
        </div>

        <div className="mx-auto px-4 sm:px-6 relative z-10" style={{ maxWidth: "75rem" }}>
          <div className="mb-12 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2
                className="text-3xl font-black"
                style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "#ffffff" }}
              >
                Услуги
              </h2>
              <p className="mt-2 text-sm" style={{ color: "#e2e8f0" }}>
                Исследование регионов — 100% сундуков, достижений и заданий
              </p>
            </div>
            <button
              onClick={() => setSuggestOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none"
              style={{ backgroundColor: "var(--accent-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary)")}
            >
              Предложить услугу
            </button>
          </div>
          <div className="flex flex-col gap-12">
            {SERVICE_CATEGORIES.map((category) => (
              <div key={category.id} className="flex flex-col gap-6">
                <h3
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "#ffffff" }}
                >
                  {category.title}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                  {category.items.map((item) => (
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
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section id="testimonials" className="py-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
          <div className="mb-12 text-center">
            <h2
              className="text-3xl font-black"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              Отзывы клиентов
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Более 3 000 довольных игроков по всей России
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-2xl p-6"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--accent-border)",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" style={{ color: "#f59e0b" }} />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed mb-4" style={{ color: "var(--text-primary)" }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {t.service}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      <Footer />
    </div>
  );
}
