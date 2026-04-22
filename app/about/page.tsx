"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 py-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "50rem" }}>
          <div className="mb-12 text-center">
            <h1
              className="text-3xl font-black mb-6"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              О нас
            </h1>
          </div>

          <div className="prose prose-slate max-w-none text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <p className="mb-4">
              Добро пожаловать в <strong>Whale Abyss</strong> — консультационный сервис по игре Genshin Impact. Мы помогаем игрокам разобраться в механиках, спланировать прохождение и быстрее достигать своих целей в игре.
            </p>
            <p className="mb-4">
              Наша задача — не выполнить работу за вас, а дать понятные инструкции, гайды и персональные консультации, чтобы вы самостоятельно проходили сложные активности с уверенным результатом.
            </p>
            <h2 className="text-xl font-bold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>Что мы предлагаем</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Консультации и гайды:</strong> пошаговые рекомендации по исследованию локаций, прохождению ивентов, сборке персонажей и оптимизации команды.</li>
              <li><strong>Прозрачность:</strong> вы всегда видите статус своего заказа в личном кабинете и можете связаться с поддержкой.</li>
              <li><strong>Гарантия качества:</strong> при невозможности оказать услугу мы возвращаем средства в соответствии с Условиями возврата.</li>
              <li><strong>Опытные специалисты:</strong> наши консультанты хорошо знают игровые механики и актуальные патчи.</li>
            </ul>
            <p className="mt-8">
              Мы не запрашиваем и не используем данные для входа в ваш игровой аккаунт. Все услуги оказываются в формате консультаций и информационной поддержки.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
