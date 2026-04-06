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
                <p>1.2. Оператором персональных данных является Самозанятая Гурова Майя Павловна (ИНН: 230412509070).</p>
                <p>1.3. Цель обработки: предоставление доступа к сервису, исполнение обязательств по договору оказания услуг и связь с пользователем.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">2. СОСТАВ ОБРАБАТЫВАЕМЫХ ДАННЫХ</h2>
              <div className="space-y-2">
                <p>2.1. Оператор может обрабатывать следующие данные, предоставленные Пользователем:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Имя или пользовательский псевдоним (никнейм);</li>
                  <li>Адрес электронной почты;</li>
                  <li>Идентификатор в мессенджере Telegram;</li>
                  <li>Технические параметры и сведения, необходимые для оказания услуг сопровождения (передаются пользователем добровольно).</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">3. ЦЕЛИ И ПРАВИЛА ОБРАБОТКИ</h2>
              <div className="space-y-2">
                <p>3.1. Обработка персональных данных ограничивается достижением конкретных, заранее определенных целей.</p>
                <p>3.2. Оператор обеспечивает конфиденциальность полученных сведений и не передает их третьим лицам, за исключением случаев, предусмотренных законодательством РФ.</p>
                <p>3.3. Технические сведения, предоставленные пользователем для реализации услуг, используются исключительно в период оказания услуги и не подлежат хранению после завершения работ.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">4. ЗАЩИТА И ХРАНЕНИЕ</h2>
              <div className="space-y-2">
                <p>4.1. Оператор принимает необходимые правовые, организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа.</p>
                <p>4.2. Персональные данные хранятся до момента достижения цели их обработки или до момента отзыва согласия Пользователем.</p>
                <p>4.3. Рекомендация по безопасности: В целях обеспечения личной цифровой безопасности Пользователю рекомендуется обновлять средства доступа (пароли) к своим внешним ресурсам после завершения взаимодействия с Сервисом.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">5. БЕЗОПАСНОСТЬ ПЛАТЕЖЕЙ</h2>
              <div className="space-y-2">
                <p>5.1. Оплата заказов осуществляется через специализированные защищенные платежные шлюзы агрегаторов-партнеров. Сервис не собирает, не обрабатывает и не хранит данные банковских карт Пользователя (такие как номер карты, CVV-коды, сроки действия).</p>
                <p>5.2. Все платежные операции передаются по безопасному протоколу HTTPS/SSL, соответствующему международным стандартам безопасности (PCI DSS).</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
