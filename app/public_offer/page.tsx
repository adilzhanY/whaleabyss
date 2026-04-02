"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PublicOfferPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl bg-white p-8 sm:p-12 text-black" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
          <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-black">ПУБЛИЧНАЯ ОФЕРТА</h1>

          <div className="space-y-8 text-sm sm:text-base leading-relaxed text-black">
            <section>
              <h2 className="text-lg font-bold mb-3 text-black">1. ОБЩИЕ ПОЛОЖЕНИЯ</h2>
              <div className="space-y-2 text-black">
                <p>1.1. Настоящий документ — предложение Самозанятой Гуровой Майи Павловны (ИНН: 230412509070), далее именуемой «Сервис», заключить Договор на техническое сопровождение игрового процесса с любым физическим лицом, далее именуемым «Пользователь».</p>
                <p>1.2. Акцептом (согласием) признается полная оплата выбранного пакета услуг на сайте <a href="https://whaleabyss.ru" target="_blank" rel="noopener noreferrer" className="font-bold underline text-blue-600 hover:text-blue-800 transition-colors">whaleabyss.ru</a>.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">2. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ</h2>
              <div className="space-y-2 text-black">
                <p>2.1. Платформа — веб-сайт <a href="https://whaleabyss.ru" target="_blank" rel="noopener noreferrer" className="font-bold underline text-blue-600 hover:text-blue-800 transition-colors">whaleabyss.ru</a>, предоставляющий интерфейс для выбора параметров сопровождения.</p>
                <p>2.2. Игровой ассистанс — комплекс технических действий (сбор материалов, прохождение этапов, развитие характеристик), выполняемых специалистами Сервиса в программной среде Genshin Impact по заданию Пользователя.</p>
                <p>2.3. Доступ — уникальные параметры авторизации, временно предоставляемые Пользователем для реализации выбранного сценария ассистанса.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">3. ПРЕДМЕТ СОГЛАШЕНИЯ</h2>
              <div className="space-y-2 text-black">
                <p>3.1. Сервис обязуется обеспечить техническое выполнение игровых задач в соответствии с выбранным тарифом, а Пользователь обязуется оплатить данные действия.</p>
                <p>3.2. Сервис самостоятельно определяет методы и привлекает необходимых технических специалистов для реализации задач в установленные сроки.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">4. ПОРЯДОК ВЗАИМОДЕЙСТВИЯ</h2>
              <div className="space-y-2 text-black">
                <p>4.1. Работа над задачей начинается с момента верификации Доступа и подтверждения параметров безопасности (2FA).</p>
                <p>4.2. Результатом услуги является достижение игрового прогресса, зафиксированного в описании тарифа. Отчет предоставляется в формате «уведомления о готовности» через электронные каналы связи.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">5. ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ</h2>
              <div className="space-y-2 text-black">
                <p>5.1. Пользователь осознает специфику взаимодействия с игровыми платформами и принимает на себя риски, связанные с внутренними правилами правообладателей ПО.</p>
                <p>5.2. Сервис гарантирует конфиденциальность и сохранность внутриигровых ценностей исключительно в период активной работы специалистов.</p>
              </div>
            </section>

            <h1 className="text-2xl sm:text-3xl font-bold mt-16 mb-8 text-center text-black">ПОЛИТИКА ОБРАБОТКИ ДАННЫХ</h1>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">1. КТО МЫ И ЧТО МЫ СОБИРАЕМ</h2>
              <div className="space-y-2 text-black">
                <p>1.1. Оператор данных — Гурова М.П. Мы собираем только то, что критически важно для работы:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Идентификатор (UID) и контакт (Email/Telegram).</li>
                  <li>Временные ключи доступа (авторизационные данные), которые используются только в сессионном режиме.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">2. ПРИНЦИП «НУЛЕВОГО ХРАНЕНИЯ»</h2>
              <div className="space-y-2 text-black">
                <p>2.1. Мы придерживаемся политики безопасности: данные пользователя не сохраняются в постоянных базах данных Сервиса.</p>
                <p>2.2. Сразу после фиксации выполнения задачи (статус «Готов») все временные данные удаляются из оперативной переписки и рабочих инструментов в течение 12 часов.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">3. ОБЯЗАТЕЛЬСТВА ПОЛЬЗОВАТЕЛЯ</h2>
              <div className="space-y-2 text-black">
                <p>3.1. В целях безопасности Пользователь обязан обновить данные своей учетной записи после завершения сессии обслуживания.</p>
                <p>3.2. С момента уведомления о выполнении задачи Сервис не несет ответственности за дальнейшую безопасность аккаунта Пользователя.</p>
              </div>
            </section>
          </div>
        </div>


      </main>

      <Footer />
    </div>
  );
}
