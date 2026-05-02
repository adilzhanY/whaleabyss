"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LEGAL, getFullRequisites, pluralizeHours } from "@/lib/legal";

/**
 * Правила оплаты и безопасность платежей. Отдельная страница, которую
 * обычно требуют платёжные агрегаторы (ВТБ, YooKassa, Tinkoff) при
 * подключении эквайринга. Должна присутствовать в футере.
 */
export default function PaymentPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
        <div
          className="mx-auto max-w-4xl bg-white p-8 sm:p-12 text-black"
          style={{ fontFamily: "var(--font-primary), sans-serif" }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-black">
            Правила оплаты и безопасность платежей
          </h1>

          <div className="space-y-8 text-sm sm:text-base leading-relaxed text-black">
            <section>
              <h2 className="text-lg font-bold mb-3">1. СПОСОБЫ ОПЛАТЫ</h2>
              <div className="space-y-2">
                <p>
                  1.1. К оплате принимаются банковские карты международных
                  платёжных систем <b>VISA</b>, <b>MasterCard</b>, а также
                  национальной платёжной системы <b>МИР</b>.
                </p>
                <p>
                  1.2. Для оплаты Заказа на Сайте {LEGAL.DOMAIN_URL}/
                  необходимо нажать кнопку «Оплатить» на странице
                  оформления Заказа и ввести данные банковской карты:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>тип карты;</li>
                  <li>номер карты;</li>
                  <li>
                    срок действия карты (указан на лицевой стороне карты);
                  </li>
                  <li>
                    имя держателя (латинскими буквами, как указано на карте);
                  </li>
                  <li>CVC2/CVV2 код.</li>
                </ul>
                <p>
                  1.3. Оплата через Систему быстрых платежей (СБП)
                  осуществляется путём сканирования QR-кода, отображаемого
                  на странице оплаты, приложением банка Пользователя.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">
                2. ПЛАТЁЖНЫЙ АГРЕГАТОР
              </h2>
              <div className="space-y-2">
                <p>
                  2.1. Услуга приёма платежей осуществляется в соответствии
                  с Правилами международных платёжных систем VISA,
                  MasterCard и Платёжной системы МИР на принципах
                  соблюдения конфиденциальности и безопасности совершения
                  платежа, для чего используются современные методы
                  проверки, шифрования и передачи данных по закрытым
                  каналам связи.
                </p>
                <p>
                  2.2. Настоящий Сайт поддерживает 256-битное шифрование.
                  Соединение с платёжным шлюзом и передача информации
                  осуществляется в защищённом режиме с использованием
                  протокола шифрования SSL/TLS.
                </p>
                <p>
                  2.3. Введённая Пользователем информация не будет
                  предоставлена третьим лицам за исключением случаев,
                  предусмотренных законодательством Российской Федерации.
                </p>
                <p>
                  2.4. Проведение платежей по банковским картам
                  осуществляется в строгом соответствии с требованиями
                  платёжных систем МИР, Visa Int., MasterCard Europe Sprl
                  и стандарта безопасности PCI DSS.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">3. БЕЗОПАСНОСТЬ ДАННЫХ</h2>
              <div className="space-y-2">
                <p>
                  3.1. {LEGAL.COMPANY_NAME} не собирает, не обрабатывает и
                  не хранит данные банковских карт Пользователя. Все
                  операции по оплате проводятся на стороне платёжного
                  агрегатора-партнёра.
                </p>
                <p>
                  3.2. Реквизиты банковской карты Пользователя вводятся
                  исключительно на защищённой странице платёжного шлюза
                  и никогда не передаются и не сохраняются на серверах
                  {" "}{LEGAL.COMPANY_NAME}.
                </p>
                <p>
                  3.3. Для дополнительной безопасности платёжный шлюз
                  может применять процедуру 3D-Secure (VISA Secure,
                  MasterCard SecureCode, MIR Accept), при которой
                  подтверждение платежа производится через банк,
                  выпустивший карту Пользователя.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">4. ПОРЯДОК ОПЛАТЫ ЗАКАЗА</h2>
              <div className="space-y-2">
                <p>
                  4.1. Оплата Заказа осуществляется единовременно в
                  порядке 100% предварительной оплаты в момент заключения
                  договора (оформления Заказа).
                </p>
                <p>
                  4.2. Пользователь обязан оплатить Заказ в течение{" "}
                  {LEGAL.PAYMENT_TIMEOUT_HOURS}{" "}
                  {pluralizeHours(LEGAL.PAYMENT_TIMEOUT_HOURS)} с момента
                  оформления Заказа. Неоплата Заказа в указанный срок
                  означает отказ Пользователя от заключения договора.
                </p>
                <p>
                  4.3. Обязательство Пользователя по оплате считается
                  исполненным с момента зачисления денежных средств на
                  расчётный счёт {LEGAL.COMPANY_NAME}.
                </p>
                <p>
                  4.4. Все издержки (комиссии), связанные с перечислением
                  денежных средств, несёт Пользователь.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">
                5. ВОЗВРАТ ДЕНЕЖНЫХ СРЕДСТВ
              </h2>
              <div className="space-y-2">
                <p>
                  5.1. Возврат денежных средств осуществляется в
                  соответствии с разделом «Возврат денежных средств»
                  Публичной оферты, размещённой по адресу:{" "}
                  {LEGAL.DOMAIN_URL}/public_offer.
                </p>
                <p>
                  5.2. Для оформления возврата необходимо направить
                  заявление на электронный адрес:{" "}
                  <a
                    href={`mailto:${LEGAL.EMAIL}`}
                    className="text-blue-600 hover:underline"
                  >
                    {LEGAL.EMAIL}
                  </a>{" "}
                  с указанием номера Заказа, причины возврата и реквизитов
                  для зачисления средств.
                </p>
                <p>
                  5.3. Возврат денежных средств осуществляется на ту же
                  банковскую карту или счёт, с которых была произведена
                  оплата, в течение {LEGAL.REFUND_DAYS} (десяти) рабочих
                  дней со дня получения заявления.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">
                6. ПОДДЕРЖКА ПОЛЬЗОВАТЕЛЕЙ
              </h2>
              <div className="space-y-2">
                <p>
                  6.1. В случае возникновения вопросов, связанных с оплатой,
                  возвратом или безопасностью платежей, Пользователь может
                  обратиться в службу поддержки {LEGAL.COMPANY_NAME}:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Email:{" "}
                    <a
                      href={`mailto:${LEGAL.EMAIL}`}
                      className="text-blue-600 hover:underline"
                    >
                      {LEGAL.EMAIL}
                    </a>
                  </li>
                  <li>
                    Telegram:{" "}
                    <a
                      href={LEGAL.TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {LEGAL.TELEGRAM_HANDLE}
                    </a>
                  </li>
                  {LEGAL.PHONE && (
                    <li>
                      Телефон:{" "}
                      <a
                        href={`tel:${LEGAL.PHONE_TEL}`}
                        className="text-blue-600 hover:underline"
                      >
                        {LEGAL.PHONE}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </section>

            <section className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-bold mb-3">Реквизиты получателя</h2>
              <div className="space-y-1 font-medium">
                {getFullRequisites().map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </section>

            <p className="text-sm text-gray-600 mt-10 text-center italic">
              Дата публикации и вступления в силу последней редакции
              Правил оплаты — {LEGAL.PAYMENT_RULES_VERSION_DATE}.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
