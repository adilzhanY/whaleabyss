"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown } from "lucide-react";

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

export default function FaqPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 py-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "50rem" }}>
          <div className="mb-12 text-center">
            <h1
              className="text-3xl font-black"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              Часто задаваемые вопросы
            </h1>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
