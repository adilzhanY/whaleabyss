"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl bg-white p-8 sm:p-12 text-black" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
          <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-black">
            Политика конфиденциальности
          </h1>

          <div className="space-y-8 text-sm sm:text-base leading-relaxed text-black">
            <section>
              <h2 className="text-lg font-bold mb-3 text-black">1. ОБЩИЕ ПОЛОЖЕНИЯ</h2>
              <div className="space-y-2">
                <p>1.1. Настоящая Политика разработана в соответствии с Федеральным законом РФ №152-ФЗ «О персональных данных».</p>
                <p>1.2. Оператором персональных данных является Самозанятая Гурова Майя Павловна.</p>
                <p>1.3. Цель обработки: исполнение обязательств по Оферте.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">2. СОСТАВ ДАННЫХ</h2>
              <div className="space-y-4">
                <p>2.1. Исполнитель обрабатывает:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Имя/Никнейм.</li>
                  <li>Контактные данные (Telegram, почта).</li>
                  <li>Данные доступа (Логин/Пароль) — обрабатываются исключительно для входа в игру и не подлежат хранению после завершения Заказа.</li>
                </ul>
                <p>2.2. Сайт может собирать анонимные данные (Cookies) для улучшения работы ресурса.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">3. ПЕРЕДАЧА И ЗАЩИТА</h2>
              <div className="space-y-2">
                <p>3.1. Данные для входа в аккаунт передаются только непосредственному исполнителю (или его помощнику).</p>
                <p>3.2. Исполнитель обязуется не передавать ваши контактные данные рекламным сервисам или иным третьим лицам.</p>
                <p>3.3. Рекомендация: После завершения работ Заказчику рекомендуется сменить пароль от игрового аккаунта. С момента смены пароля Исполнитель утрачивает доступ к данным и ответственность за них.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">4. СРОКИ ХРАНЕНИЯ</h2>
              <div className="space-y-2">
                <p>4.1. Персональные данные (имя, контакты) хранятся до момента отзыва согласия Заказчиком.</p>
                <p>4.2. Внутриигровые данные (пароли) удаляются из переписки/баз данных в течение 24 часов после завершения Заказа.</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
