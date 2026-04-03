"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Алексей К.",
    avatar: "АК",
    text: "Заказал исследование Мондштадта — всё сделали за пару часов. Никаких проблем с аккаунтом. Рекомендую!",
    rating: 5,
    service: "Мондштадт 100%",
  },
  {
    name: "Мария П.",
    avatar: "МП",
    text: "Брала услугу сопровождения Инадзумы и Энканомии. Ребята профессионалы, оперативно и аккуратно. Уже второй раз обращаюсь.",
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

export default function ReviewsPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 py-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
          <div className="mb-12 text-center">
            <h1
              className="text-3xl font-black mb-6"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              Отзывы клиентов
            </h1>
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
      </main>

      <Footer />
    </div>
  );
}
