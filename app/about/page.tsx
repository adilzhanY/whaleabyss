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
              Добро пожаловать в <strong>Whale Abyss</strong> — ваш надежный сервис для профессионального сопровождения аккаунтов в Genshin Impact. Мы понимаем, что в современном мире не всегда хватает времени на полное исследование необъятных миров Тейвата, сбор всех сундуков и выполнение рутинных заданий.
            </p>
            <p className="mb-4">
              Именно поэтому мы собрали команду опытных специалистов, которые готовы взять эту задачу на себя. Наша главная цель — обеспечить быстрое, качественное и абсолютно безопасное развитие вашего аккаунта.
            </p>
            <h2 className="text-xl font-bold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>Наши преимущества</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Безопасность превыше всего:</strong> Мы используем проверенные методы и VPN для защиты вашего аккаунта.</li>
              <li><strong>Прозрачность:</strong> Вы всегда знаете статус вашего заказа и можете связаться с поддержкой.</li>
              <li><strong>Гарантия качества:</strong> В случае возникновения проблем мы возвращаем деньги в полном объеме.</li>
              <li><strong>Опытные специалисты:</strong> Наша команда состоит из экспертов, знающих все секреты игры.</li>
            </ul>
            <p className="mt-8">
              Доверьте нам свой прогресс, и наслаждайтесь игрой без лишнего гринда!
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
