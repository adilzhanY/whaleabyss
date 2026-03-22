"use client";

import { useState } from "react";
import { MousePointerClick, CreditCard, Trophy, Star, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";

// ── Service data ────────────────────────────────────────────────────────────
import { SERVICES } from "@/lib/services";

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

// ── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Безопасно ли передавать данные аккаунта?",
    a: "Мы используем VPN вашего региона и никогда не меняем данные профиля. За более чем 3 000 выполненных заказов не было ни одного бана.",
  },
  {
    q: "Сколько времени занимает буст?",
    a: "В зависимости от региона — от 1 до 12 часов. Точные сроки указаны в описании каждой услуги.",
  },
  {
    q: "Что если что-то пойдёт не так?",
    a: "Мы гарантируем возврат средств в полном объёме, если не сможем выполнить заказ.",
  },
  {
    q: "Нужно ли мне быть онлайн во время буста?",
    a: "Нет. Вы можете спокойно заниматься своими делами, пока наш бустер работает над вашим аккаунтом.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--accent-border)", backgroundColor: "var(--bg-card)" }}
    >
      <button
        className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-sm"
        style={{ color: "var(--text-primary)" }}
        onClick={() => setOpen(!open)}
      >
        <span>{q}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform ml-4"
          style={{
            color: "var(--accent-primary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div
          className="border-t px-6 py-4 text-sm leading-relaxed"
          style={{ borderColor: "var(--accent-border)", color: "var(--text-secondary)" }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <CartModal />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

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
              "linear-gradient(135deg, rgba(15,23,42,0.72) 0%, rgba(120,53,15,0.60) 50%, rgba(79,70,229,0.45) 100%)",
          }}
        />

        <div className="relative mx-auto px-4 sm:px-6 text-center" style={{ maxWidth: "75rem" }}>
          <span
            className="mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: "rgba(79,70,229,0.25)", color: "#a5b4fc", border: "1px solid rgba(79,70,229,0.4)" }}
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
            Профессиональный{" "}
            <span style={{ color: "#6366f1" }}>буст аккаунтов</span>{" "}
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
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundColor: "var(--accent-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary)")}
            >
              Выбрать услугу
            </a>
            <div className="flex items-center gap-6 text-xs font-medium" style={{ color: "#cbd5e1" }}>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                3 000+ заказов
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
        className="py-20"
        style={{ backgroundColor: "var(--bg-highlight)" }}
      >
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
          <div className="mb-12 text-center">
            <h2
              className="text-3xl font-black"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              Услуги
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Исследование регионов — 100% сундуков, достижений и заданий
            </p>
          </div>
          <div
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            style={{ gridAutoFlow: "dense" }}
          >
            {SERVICES.map((item) => (
              <ServiceCard key={item.id} item={item} />
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

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section
        id="faq"
        className="py-20"
        style={{ backgroundColor: "var(--bg-highlight)" }}
      >
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "50rem" }}>
          <div className="mb-12 text-center">
            <h2
              className="text-3xl font-black"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              Часто задаваемые вопросы
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer
        className="border-t py-8 text-center text-sm"
        style={{
          borderColor: "var(--accent-border)",
          backgroundColor: "var(--bg-card)",
          color: "var(--text-secondary)",
        }}
      >
        <p>© 2026 Китовая Бездна. Все права защищены.</p>
        <p className="mt-1 text-xs opacity-60">
          Не является официальным сервисом miHoYo / HoYoverse.
        </p>
      </footer>
    </div>
  );
}
