import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full text-white py-10 px-4 sm:px-6" style={{ backgroundColor: "#021235", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
      <div className="mx-auto flex flex-col md:flex-row justify-between items-start md:items-center max-w-[75rem] mb-8 gap-8">

        {/* Left Side: Logo and Links */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 lg:gap-16">
          <Link href="/" className="flex items-center">
            <Image src="/icons/whale_abyss_logo.jpg" alt="Whale Abyss" width={80} height={80} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover" />
          </Link>

          <div className="flex gap-16 text-sm font-medium">
            <div className="flex flex-col gap-4">
              <Link href="/about" className="transition-colors hover:text-indigo-400">О нас</Link>
              <Link href="/faq" className="transition-colors hover:text-indigo-400">FAQ</Link>
            </div>
            <div className="flex flex-col gap-4">
              <Link href="/reviews" className="transition-colors hover:text-indigo-400">Отзывы</Link>
            </div>
          </div>
        </div>

        {/* Right Side: Social Media */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm font-medium">
          <span>Мы в социальных сетях:</span>
          <div className="flex items-center gap-2">
            <a href="https://t.me/whaleabyss" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:bg-white transition-colors overflow-hidden">
              <Image src="/icons/tg_logo.png" alt="Telegram" width={40} height={40} className="w-full h-full object-cover" />
            </a>
            <a href="https://www.tiktok.com/@whaleabyss" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:bg-white transition-colors overflow-hidden">
              <Image src="/icons/tiktok_logo.jpg" alt="TikTok" width={40} height={40} className="w-full h-full object-cover" />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex justify-end max-w-[75rem] border-t border-white/10 pt-6 text-sm text-gray-300">
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <Link href="/privacy" className="hover:text-white transition-colors">Конфиденциальность</Link>
          <span className="text-gray-500">|</span>
          <Link href="/public_offer" className="hover:text-white transition-colors">Публичная оферта</Link>
        </div>
      </div>
    </footer>
  );
}
