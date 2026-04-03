"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Никита",
    avatar: "НИ",
    text: "заказывал Исследование натлана 100%, сделали быстро и качественно",
    rating: 5,
  },
  {
    name: "Анастасия",
    avatar: "/images/reviews/ava2.jpg",
    text: "очень всегда быстро помогает и за приятную цену, огромное спасибо за помощь, не сомневаюсь, что если снова понадобится помощь, то обращусь именно к whale abyss 🥺",
    rating: 5,
  },
  {
    name: "Кирилл",
    avatar: "КИ",
    text: "беру уже 2 раз!! делает работу быстро. общение очень доброжелательное, цены 🔥 всем советую)",
    rating: 5,
  },
  {
    name: "Екатерина",
    avatar: "ЕК",
    text: "Очень качественная услуга за такую цену, супер-довольна, сделано все быстро!",
    rating: 5,
  },
  {
    name: "Денис",
    avatar: "/images/reviews/ava6.jpg",
    text: "заказывал театр на 10 актов, сделали оч быстро и все цветочки ещё собрали, я доволен",
    rating: 5,
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
      </main>

      <Footer />
    </div>
  );
}
