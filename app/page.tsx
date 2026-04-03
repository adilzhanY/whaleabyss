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
    desc: "Наши специалисты выполняют заказ быстро и конфиденциально. Мы уведомим вас о готовности.",
  },
];

// ── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Migyiness",
    avatar: "MI",
    text: "заказывал Исследование натлана 100%, сделали быстро и качественно",
    rating: 5,
  },
  {
    name: "Анастасия",
    avatar: "АН",
    text: "очень всегда быстро помогает и за приятную цену, огромное спасибо за помощь, не сомневаюсь, что если снова понадобится помощь, то обращусь именно к whale abyss 🥺",
    rating: 5,
  },
  {
    name: "Кирилл",
    avatar: "КИ",
    text: "беру уже 2 раз!! делает работу быстро. общение очень доброжелательное, цены 🔥 всем советую)",
    rating: 5,
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

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative overflow-hidden py-24 sm:py-32"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage: `
            radial-gradient(at 40% 20%, hsla(210,100%,74%,0.3) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsla(250,100%,79%,0.3) 0px, transparent 50%),
            radial-gradient(at 0% 50%, hsla(350,100%,89%,0.3) 0px, transparent 50%),
            radial-gradient(at 80% 50%, hsla(180,100%,74%,0.3) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(290,100%,84%,0.3) 0px, transparent 50%),
            radial-gradient(at 80% 100%, hsla(20,100%,89%,0.3) 0px, transparent 50%),
            radial-gradient(at 0% 0%, hsla(220,100%,79%,0.3) 0px, transparent 50%)
          `,
        }}
      >
        {/* TEXT CONTENT */}
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:px-12 lg:flex-row">
          <div className="text-left w-full sm:w-auto">
            <span
              className="mb-4 inline-block rounded-full px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center sm:text-left wrap-break-word max-w-full"
              style={{ backgroundColor: "rgba(30,58,138,0.05)", color: "var(--accent-primary)", border: "1px solid rgba(30,58,138,0.15)" }}
            >
              #1 Сервис сопровождения Genshin Impact
            </span>
            <h1
              className="mb-6 max-w-3xl text-3xl font-black leading-tight sm:text-5xl lg:text-6xl tracking-tight text-slate-800 wrap-break-word w-full overflow-hidden"
              style={{
                fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
                color: "#1e293b",
                wordBreak: "break-word",
                hyphens: "auto"
              }}
            >
              Ваш персональный
              <br className="hidden sm:block" />
              <span style={{ color: "var(--accent-primary)" }}> игровой ассистент</span> в
              <br />
              <span style={{ fontWeight: "bold" }}>Genshin Impact</span>
            </h1>
            <p
              className="mb-10 max-w-xl text-sm sm:text-lg leading-relaxed text-slate-600 font-medium wrap-break-word w-full"
            >
              Быстро, безопасно и с гарантией результата. Позвольте экспертам позаботиться о вашей рутине, пока вы наслаждаетесь историей Тейвата.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3 w-full max-w-[100vw]">
              <a
                href="#services"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-3xl px-4 sm:px-8 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: "var(--accent-primary)", boxShadow: "0 10px 15px -3px rgba(30, 58, 138, 0.2)", fontFamily: "var(--font-montserrat), Montserrat, sans-serif", }}
              >
                Выбрать услугу
              </a>
              <a
                href="#how"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-3xl bg-white px-4 sm:px-8 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5"
                style={{ color: "var(--accent-primary)", fontFamily: "var(--font-montserrat), Montserrat, sans-serif", border: "1px solid rgba(30,58,138,0.1)" }}
              >
                Узнать больше
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-start gap-8">
              {/* <div className="flex items-center gap-2">
                <ChevronDown className="h-5 w-5 animate-bounce text-accent-primary" />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Прокрутите вниз, чтобы увидеть услуги
                </span>
              </div> */}
            </div>
          </div>

          <div className="relative hidden md:flex justify-center lg:justify-end mt-10 lg:mt-0">
            <div
              className="relative w-full max-w-sm aspect-square transform transition-transform duration-500 hover:rotate-0 hover:scale-[1.02]"
              style={{ transform: "rotate(4deg)" }}
            >
              {/* Subtle Drop shadow / glow behind the tilted image */}
              <div className="absolute inset-0 rounded-[2.5rem] bg-blue-900/10 blur-2xl transform shadow-2xl translate-y-8 translate-x-4 mix-blend-multiply"></div>

              <img
                src="/icons/whale_abyss_logo.jpg"
                alt="Whale Abyss"
                className="relative w-full h-full object-cover rounded-[2.5rem] shadow-2xl"
                style={{
                  border: "2px solid rgba(255,255,255,0.4)",
                  boxShadow: "0 25px 50px -12px rgba(30, 58, 138, 0.3)"
                }}
              />
            </div>
          </div>
        </div>
      </section>      {/* ── HOW IT WORKS ───────────────────────────────────────────────────────── */}
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
        <div className="absolute inset-0 pointer-events-none z-0 bg-white">
          {/* Subtle Icy Blue Tech Glows */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `
        radial-gradient(circle at 0% 0%, rgba(220, 235, 255, 0.5) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(200, 225, 250, 0.4) 0%, transparent 50%)
      `,
              filter: "blur(40px)"
            }}
          />
          {/* Engineering / Blueprint Grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tech-grid" width="64" height="64" patternUnits="userSpaceOnUse">
                <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#334155" strokeWidth="1" opacity="0.08" />
                {/* Adds tiny crosshairs at the grid intersections for a tech feel */}
                <path d="M -4 0 L 4 0 M 0 -4 L 0 4" fill="none" stroke="#334155" strokeWidth="2" opacity="0.15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tech-grid)" />
          </svg>
        </div>

        <div className="mx-auto px-4 sm:px-6 relative z-10" style={{ maxWidth: "75rem" }}>
          <div className="flex flex-col gap-12">
            {SERVICE_CATEGORIES.map((category) => (
              <div key={category.id} className="flex flex-col gap-6">
                <h3
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "black" }}
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
              Более 500 довольных игроков по всей России
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ gridAutoFlow: "dense" }}>
            {TESTIMONIALS.map((t) => {
              const spanClass = t.text.length > 120 ? "sm:col-span-2 sm:row-span-2" : t.text.length > 80 ? "sm:row-span-2" : "";

              return (
                <div
                  key={t.name}
                  className={`flex flex-col rounded-3xl p-6 ${spanClass}`}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--accent-border)",
                    boxShadow: "var(--card-shadow)",
                    borderRadius: "2rem"
                  }}
                >
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current shrink-0" style={{ color: "#f59e0b" }} />
                    ))}
                  </div>
                  <p className={`flex-1 font-semibold leading-relaxed mb-4 ${t.text.length > 120 ? 'text-lg sm:text-2xl' : 'text-base sm:text-lg'}`} style={{ color: "var(--text-primary)" }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                        {t.name}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>



      <Footer />
    </div>
  );
}
