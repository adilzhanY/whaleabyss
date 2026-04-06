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
          <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-black">
            ПУБЛИЧНАЯ ОФЕРТА
            <span className="block text-lg sm:text-xl mt-2 font-medium text-black">о заключении договора на оказание услуг по техническому сопровождению в цифровых средах</span>
          </h1>

          <div className="space-y-8 text-sm sm:text-base leading-relaxed text-black">
            <section>
              <h2 className="text-lg font-bold mb-3 text-black">1. Общие положения</h2>
              <div className="space-y-2 text-black">
                <p>1.1. Настоящая Оферта является предложением Самозанятой Гуровой Майи Павловны (ИНН: 230412509070), далее — «Сервис», заключить Договор на оказание услуг технического и консультационного характера с любым дееспособным лицом («Пользователь»).</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">2. Термины и определения</h2>
              <div className="space-y-2 text-black">
                <p>2.1. Игровой ассистанс (Услуга) — комплекс дистанционных действий специалистов Сервиса по технической поддержке, аналитике и сопровождению Пользователя в рамках выбранного программного обеспечения (ПО).</p>
                <p>2.2. Технические параметры — данные, предоставляемые Пользователем добровольно, необходимые для синхронизации и реализации выбранного пакета услуг сопровождения.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">3. Предмет Договора</h2>
              <div className="space-y-2 text-black">
                <p>3.1. Сервис обязуется оказать услуги по техническому сопровождению и консультированию в рамках ПО по заданию Пользователя, а Пользователь — оплатить эти услуги.</p>
                <p>3.2. Объем услуг определяется выбранным тарифом на Сайте:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>«Исследование» — навигационная и аналитическая поддержка.</li>
                  <li>«Техническое обслуживание» — реализация рутинных алгоритмов взаимодействия с ПО.</li>
                  <li>«Развитие» — экспертные консультации по оптимизации параметров.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">4. Права и обязанности Сторон</h2>
              <div className="space-y-2 text-black">
                <p>4.1. Сервис обязуется: обеспечить конфиденциальность предоставленных технических данных и использовать их исключительно в период оказания услуг.</p>
                <p>4.2. Пользователь обязуется:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Обеспечить техническую возможность для реализации услуг сопровождения.</li>
                  <li>Сменить идентификационные данные (средства доступа) к своему ПО немедленно после получения уведомления о завершении работ в целях личной цифровой безопасности.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">5. Ограничение ответственности</h2>
              <div className="space-y-2 text-black">
                <p>5.1. Пользователь самостоятельно несет ответственность за взаимодействие с правообладателями ПО и соблюдение их внутренних правил.</p>
                <p>5.2. Сервис оказывает услуги по прямому поручению Пользователя и не несет ответственности за любые последствия, связанные с использованием Пользователем сторонних технических сервисов.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-black">6. Условия отмены заказа и возврата средств</h2>
              <div className="space-y-2 text-black">
                <p>6.1. Пользователь вправе отказаться от Услуги и потребовать возврат уплаченных средств в полном объеме до момента фактического начала выполнения работ специалистом Сервиса.</p>
                <p>6.2. В случае отказа Пользователя от Услуги в процессе ее выполнения (когда работы уже начаты), возврат средств осуществляется за вычетом фактически понесенных расходов Сервиса, пропорционально объему уже выполненной работы.</p>
                <p>6.3. Если Услуга оказана в полном объеме и надлежащего качества, возврат средств не производится.</p>
                <p>6.4. Требование о возврате средств направляется Пользователем на электронную почту support@whaleabyss.ru с указанием причины возврата, номера заказа и контактных данных. Срок рассмотрения заявки на возврат составляет до 7 (семи) рабочих дней.</p>
                <p>6.5. Возврат денежных средств осуществляется на ту же банковскую карту или счет, с которых была произведена первоначальная оплата.</p>
              </div>
            </section>

            <section className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-black">Исполнитель:</h2>
              <div className="space-y-1 text-black font-medium">
                <p>Самозанятая Гурова Майя Павловна</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>ИНН: 230412509070</li>
                  <li>E-mail: <a href="mailto:support@whaleabyss.ru" className="text-blue-600 hover:underline">support@whaleabyss.ru</a></li>
                </ul>
              </div>
            </section>
          </div>
        </div>


      </main>

      <Footer />
    </div>
  );
}
