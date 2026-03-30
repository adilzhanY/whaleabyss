import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full text-white py-6 px-4 sm:px-6" style={{ backgroundColor: "#021235", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
      <div className="mx-auto flex flex-col md:flex-row justify-between items-start md:items-center max-w-[75rem] mb-6 gap-6">

        {/* Top Side: Links */}
        <div className="flex gap-8 sm:gap-16 text-sm font-medium w-full">
          <Link href="/about" className="transition-colors hover:text-blue-400">О нас</Link>
          <Link href="/faq" className="transition-colors hover:text-blue-400">FAQ</Link>
          <Link href="/reviews" className="transition-colors hover:text-blue-400">Отзывы</Link>
        </div>
      </div>

      <div className="mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center max-w-[75rem] border-t border-white/10 pt-4 text-sm text-gray-300 gap-4">
        {/* Left Side: Social Media */}
        <div className="flex items-center gap-4 text-sm font-medium text-white">
          <span>Мы в социальных сетях:</span>
          <div className="flex items-center gap-2">
            <a href="https://t.me/whaleabyss" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:bg-white transition-colors overflow-hidden">
              <Image src="/icons/tg_logo.png" alt="Telegram" width={40} height={40} className="w-full h-full object-cover" />
            </a>
            <a href="https://www.tiktok.com/@whaleabyss" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E2E8F0] rounded-xl hover:bg-white transition-colors overflow-hidden">
              <Image src="/icons/tiktok_logo.jpg" alt="TikTok" width={40} height={40} className="w-full h-full object-cover" />
            </a>
          </div>
        </div>

        {/* Right Side: Legal Links */}
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <Link href="/privacy" className="hover:text-white transition-colors">Конфиденциальность</Link>
          <span className="text-gray-500">|</span>
          <Link href="/public_offer" className="hover:text-white transition-colors">Публичная оферта</Link>
        </div>
      </div>

      {/* Legal Entity Info */}
      <div className="mx-auto max-w-7xl mt-6 text-xs text-gray-500 text-center md:text-left">
        Самозанятая Гурова Майя Павловна, ИНН: 230412509070
      </div>
    </footer>
  );
}