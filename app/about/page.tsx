"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";

export default function AboutPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "50rem" }}>
          <Breadcrumb />
          <div className="mb-12 text-center">
            <h1
              className="text-4xl font-black text-blue-950 mb-4"
              style={{ fontFamily: "var(--font-primary), sans-serif" }}
            >
              О нас
            </h1>
          </div>

          <div className="prose prose-slate max-w-none text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <p className="mb-4">
              Добро пожаловать в <strong>Whale Abyss</strong> — сервис персонального сопровождения игроков Genshin Impact. Мы помогаем тем, у кого не всегда хватает времени на полное исследование необъятных миров Тейвата, получить желаемый игровой результат быстро и без лишних хлопот.
            </p>
            <p className="mb-4">
              Мы собрали команду опытных специалистов, которые готовы взять рутинные задачи на себя и помочь вам достичь ваших игровых целей. Наша главная цель — обеспечить быстрое, качественное и комфортное сопровождение по выбранным вами направлениям развития аккаунта.
            </p>
            <h2 className="text-xl font-bold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>Наши преимущества</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Конфиденциальность:</strong> все данные, предоставленные при оформлении заказа, обрабатываются в соответствии с 152-ФЗ и используются исключительно для исполнения поручения.</li>
              <li><strong>Прозрачность:</strong> вы всегда знаете статус вашего заказа и можете связаться с поддержкой в любое время.</li>
              <li><strong>Гарантия качества:</strong> в случае возникновения проблем с исполнением заказа мы возвращаем денежные средства в соответствии с публичной офертой.</li>
              <li><strong>Опытные специалисты:</strong> наша команда состоит из экспертов, знающих все тонкости игры и её внутренние механики.</li>
            </ul>
            <p className="mt-8">
              Доверьте рутину нам и наслаждайтесь тем, что в игре вам действительно интересно — историей, эстетикой и геймплеем.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
