import Link from "next/link";
import { Lock } from "lucide-react";
import { LEGAL, getPartyShortLabel } from "@/lib/legal";
import SocialIcon from "./SocialIcon";

export default function Footer() {
  return (
    <footer
      className="w-full text-slate-800 py-6 px-4 sm:px-6"
      style={{
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        fontFamily: "var(--font-primary), sans-serif",
      }}
    >
      <div className="mx-auto flex flex-col md:flex-row justify-between items-start md:items-center max-w-300 mb-6 gap-6">
        {/* Top Side: Links */}
        <div className="flex gap-8 sm:gap-16 text-sm font-semibold w-full">
          <Link
            href="/about"
            className="transition-colors hover:text-blue-600"
          >
            О нас
          </Link>
          <Link
            href="/faq"
            className="transition-colors hover:text-blue-600"
          >
            FAQ
          </Link>
          <Link
            href="/reviews"
            className="transition-colors hover:text-blue-600"
          >
            Отзывы
          </Link>
        </div>
      </div>

      <div className="mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center max-w-300 border-t border-slate-200 pt-4 text-sm text-slate-600 gap-4">
        {/* Social Media */}
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-800">
          <span>Мы в социальных сетях:</span>
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/whaleabyss"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="group flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all"
            >
              <SocialIcon
                type="telegram"
                className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 group-hover:text-[var(--accent-primary)] transition-colors"
              />
            </a>
            <a
              href="https://www.tiktok.com/@whaleyuureiq"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="group flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all"
            >
              <SocialIcon
                type="tiktok"
                className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 group-hover:text-[var(--accent-primary)] transition-colors"
              />
            </a>
            <a
              href="https://www.twitch.tv/whaleabyssboost"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitch"
              className="group flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all"
            >
              <SocialIcon
                type="twitch"
                className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 group-hover:text-[var(--accent-primary)] transition-colors"
              />
            </a>
          </div>
        </div>

        {/* Legal Links */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href="/info"
              className="hover:text-blue-600 transition-colors"
            >
              О сервисе
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <Link
              href="/public_offer"
              className="hover:text-blue-600 transition-colors"
            >
              Публичная оферта
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <Link
              href="/privacy"
              className="hover:text-blue-600 transition-colors"
            >
              Конфиденциальность
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <Link
              href="/payment"
              className="hover:text-blue-600 transition-colors"
            >
              Правила оплаты
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <Link
              href="/contacts"
              className="hover:text-blue-600 transition-colors"
            >
              Контакты
            </Link>
          </div>
        </div>
      </div>

      {/* Legal Entity Info & Contacts */}
      <div className="mx-auto flex flex-col md:flex-row justify-between items-start md:items-start max-w-300 mt-6 text-xs text-slate-500 gap-4">
        <div className="space-y-0.5">
          <div>{getPartyShortLabel()}</div>
          <div>ИНН: {LEGAL.INN}</div>
          {!LEGAL.ADDRESS.startsWith("<") && (
            <div>{LEGAL.ADDRESS}</div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <a
            href={`mailto:${LEGAL.EMAIL}`}
            className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
          >
            {LEGAL.EMAIL}
          </a>
          {LEGAL.PHONE && (
            <a
              href={`tel:${LEGAL.PHONE_TEL}`}
              className="hover:text-blue-600 transition-colors flex items-center gap-1.5 font-semibold"
            >
              {LEGAL.PHONE}
            </a>
          )}
        </div>
      </div>

      {/* Bug report */}
      <div className="mx-auto flex max-w-300 mt-4 text-xs text-slate-500">
        <span>
          Нашли ошибку? Сообщите нам:{" "}
          <a
            href="https://t.me/whaleabyss_official"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#0B5191] hover:underline whitespace-nowrap"
          >
            @whaleabyss_official
          </a>
        </span>
      </div>

      {/* Payment methods (neutral, no aggregator branding) */}
      <div className="mx-auto flex justify-center sm:justify-start max-w-300 mt-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5" />
          <span>Безопасная оплата · СБП</span>
        </div>
      </div>
    </footer>
  );
}
