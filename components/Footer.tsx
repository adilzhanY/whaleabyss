import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full text-slate-800 py-6 px-4 sm:px-6" style={{ backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
      <div className="mx-auto flex flex-col md:flex-row justify-between items-start md:items-center max-w-300 mb-6 gap-6">

        {/* Top Side: Links */}
        <div className="flex gap-8 sm:gap-16 text-sm font-semibold w-full">
          <Link href="/about" className="transition-colors hover:text-blue-600">О нас</Link>
          <Link href="/faq" className="transition-colors hover:text-blue-600">FAQ</Link>
          <Link href="/reviews" className="transition-colors hover:text-blue-600">Отзывы</Link>
        </div>
      </div>

      <div className="mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center max-w-300 border-t border-slate-200 pt-4 text-sm text-slate-600 gap-4">
        {/* Left Side: Social Media */}
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-800">
          <span>Мы в социальных сетях:</span>
          <div className="flex items-center gap-2">
            <a href="https://t.me/whaleabyss" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden">
              <Image src="/icons/tg_logo.png" alt="Telegram" width={40} height={40} className="w-full h-full object-cover" />
            </a>
            <a href="https://www.tiktok.com/@whaleyuureiq" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden">
              <Image src="/icons/tiktok_logo.jpg" alt="TikTok" width={40} height={40} className="w-full h-full object-cover" />
            </a>
          </div>
        </div>

        {/* Right Side: Legal Links and Contact */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Конфиденциальность</Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <Link href="/public_offer" className="hover:text-blue-600 transition-colors">Публичная оферта</Link>
          </div>
        </div>
      </div>

      {/* Legal Entity Info & Contacts */}
      <div className="mx-auto flex flex-col md:flex-row justify-between items-start md:items-center max-w-300 mt-6 text-xs text-slate-500 gap-4">
        <div>
          Самозанятая Гурова Майя Павловна, ИНН: 230412509070
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <a href="mailto:support@whaleabyss.ru" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
            support@whaleabyss.ru
          </a>
        </div>
      </div>

      {/* FreeKassa Banner */}
      <div className="mx-auto flex justify-center sm:justify-start max-w-300 mt-6 opacity-80 hover:opacity-100 transition-opacity">
        <a href="https://freekassa.net" target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.freekassa.net/banners/small-white-1.png"
            title="Прием платежей на сайте для физических лиц и т.д."
            alt="FreeKassa"
            className="h-auto w-auto max-h-10 grayscale hover:grayscale-0 transition-all duration-300"
          />
        </a>
      </div>
    </footer>
  );
}