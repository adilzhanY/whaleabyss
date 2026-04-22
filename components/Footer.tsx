import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer
      className="w-full text-slate-800 py-6 px-4 sm:px-6"
      style={{
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
      }}
    >
      <div className="mx-auto flex flex-col md:flex-row justify-between items-start md:items-center max-w-300 mb-6 gap-6">
        {/* Top Side: Navigation */}
        <div className="flex gap-8 sm:gap-16 text-sm font-semibold w-full">
          <Link href="/about" className="transition-colors hover:text-blue-600">О нас</Link>
          <Link href="/faq" className="transition-colors hover:text-blue-600">FAQ</Link>
          <Link href="/reviews" className="transition-colors hover:text-blue-600">Отзывы</Link>
        </div>
      </div>

      <div className="mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center max-w-300 border-t border-slate-200 pt-4 text-sm text-slate-600 gap-4">
        {/* Left: Social media */}
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-800">
          <span>Мы в социальных сетях:</span>
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/whaleabyss"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden"
            >
              <Image src="/icons/tg_logo.png" alt="Telegram" width={40} height={40} className="w-full h-full object-cover" />
            </a>
            <a
              href="https://www.tiktok.com/@whaleyuureiq"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden"
            >
              <Image src="/icons/tiktok_logo.jpg" alt="TikTok" width={40} height={40} className="w-full h-full object-cover" />
            </a>
            <a
              href="https://www.twitch.tv/whaleabyssboost"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden p-0.5"
            >
              <Image src="/icons/twitch.png" alt="Twitch" width={40} height={40} className="w-full h-full object-cover rounded-[10px]" />
            </a>
          </div>
        </div>

        {/* Right: Legal document links */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/public_offer" className="hover:text-blue-600 transition-colors">
              Публичная оферта
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">
              Политика конфиденциальности
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <Link href="/refund" className="hover:text-blue-600 transition-colors">
              Условия возврата
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Full legal / merchant disclosure block (shown on every page).       */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto max-w-300 mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Legal entity */}
          <div className="space-y-1">
            <div className="font-semibold text-slate-800">Исполнитель</div>
            <div>Самозанятая Гурова Майя Павловна</div>
            <div>ИНН: 230412509070</div>
            <div>Плательщик налога на профессиональный доход (№ 422-ФЗ)</div>
            <div>Место ведения деятельности: Краснодарский край, Российская Федерация</div>
          </div>

          {/* Contacts */}
          <div className="space-y-1">
            <div className="font-semibold text-slate-800">Связаться с нами</div>
            <div>
              E-mail:{" "}
              <a
                href="mailto:support@whaleabyss.ru"
                className="hover:text-blue-600 transition-colors"
              >
                support@whaleabyss.ru
              </a>
            </div>
            <div>
              Телефон:{" "}
              <a
                href="tel:+79384089608"
                className="hover:text-blue-600 transition-colors font-semibold"
              >
                +7 (938) 408-96-08
              </a>
            </div>
            <div>
              Telegram:{" "}
              <a
                href="https://t.me/whaleabyss_official"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors"
              >
                @whaleabyss_official
              </a>
            </div>
            <div>Часы работы поддержки: ежедневно, 10:00–22:00 (МСК)</div>
          </div>

          {/* Payments */}
          <div className="space-y-1">
            <div className="font-semibold text-slate-800">Оплата и документы</div>
            <div>
              Приём платежей осуществляется платёжным агрегатором по защищённому
              протоколу HTTPS/SSL (PCI DSS). Реквизиты банковских карт Сервисом не
              собираются и не хранятся.
            </div>
            <div>
              После оплаты Пользователю направляется чек, сформированный через
              сервис ФНС «Мой налог».
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 text-[11px] leading-relaxed text-slate-500">
          Сайт whaleabyss.ru оказывает исключительно информационно-консультационные
          услуги по видеоигре Genshin Impact (гайды, консультации, индивидуальные
          рекомендации). Сервис не осуществляет вход в учётные записи пользователей
          и не выполняет каких-либо действий от их имени. Все торговые марки и
          названия игр принадлежат их правообладателям и упоминаются исключительно
          в информационных целях. Оформляя заказ, пользователь подтверждает, что
          ознакомлен и согласен с{" "}
          <Link href="/public_offer" className="underline hover:text-blue-600">
            Публичной офертой
          </Link>
          ,{" "}
          <Link href="/privacy" className="underline hover:text-blue-600">
            Политикой конфиденциальности
          </Link>{" "}
          и{" "}
          <Link href="/refund" className="underline hover:text-blue-600">
            Условиями возврата
          </Link>
          .
        </div>

        <div className="mt-3 text-[11px] text-slate-500">
          © {new Date().getFullYear()} whaleabyss.ru. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
