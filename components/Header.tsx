"use client";

import { ShoppingCart, Menu, X, User } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";

interface HeaderProps {
  onAuthOpen: () => void;
}

export default function Header({ onAuthOpen }: HeaderProps) {
  const { cartCount, openCart } = useCart();
  const count = cartCount();
  const { data: session } = useSession();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--accent-border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6"
        style={{ maxWidth: "75rem" }}
      >
        {/* Main Nav: Mobile Hamburger + Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger icon for mobile */}
          <button
            className="md:hidden p-1 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl" style={{ color: "var(--accent-primary)", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
            <img src="/icons/whale_abyss_logo.jpg" alt="Whale Abyss" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover" />
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-montserrat), Montserrat, sans-serif"
          }}>
          {[
            { label: "Главная", href: "/" },
            { label: "Услуги", href: "/#services" },
            { label: "Отзывы", href: "/reviews" },
            { label: "FAQ", href: "/faq" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#1e3a8a]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <Link
              href="/profile"
              className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full overflow-hidden border-2 border-transparent transition-all hover:border-blue-600 block shrink-0"
            >
              {session.user?.image ? (
                <img src={session.user.image} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-900 font-bold text-base uppercase">
                  {session.user?.name ? session.user.name.charAt(0) : <User className="h-5 w-5 text-slate-700" />}
                </div>
              )}
            </Link>
          ) : (
            <button
              onClick={onAuthOpen}
              className="inline-flex items-center rounded-3xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: "var(--accent-primary)",
                fontFamily: "var(--font-montserrat), Montserrat, sans-serif"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary)")}
            >
              <span className="hidden sm:inline">Войти / Регистрация</span>
              <span className="inline sm:hidden">Войти</span>
            </button>
          )}

          {/* Cart icon */}
          <button
            onClick={openCart}
            className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-colors shrink-0"
            style={{ backgroundColor: "var(--bg-highlight)" }}
            aria-label="Корзина"
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: "var(--accent-primary)" }} />
            {count > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? "opacity-100 block" : "opacity-0 hidden pointer-events-none"}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[80%] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <img src="/icons/whale_abyss_logo.jpg" alt="Whale Abyss Logo" className="h-10 w-10 rounded-full object-cover" />
            <span className="font-bold text-slate-800 text-lg">Меню</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <Link href="/" className="block py-3 px-4 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Главная</Link>
            <Link href="/about" className="block py-3 px-4 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>О нас</Link>
            <Link href="/faq" className="block py-3 px-4 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>FAQ</Link>
            <Link href="/reviews" className="block py-3 px-4 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Отзывы</Link>
          </div>

          <div className="mt-auto border-t border-slate-100 pt-6">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Мы в соцсетях</p>
            <div className="flex gap-4 px-4">
              <a href="https://t.me/whaleabyss" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden" onClick={() => setIsMobileMenuOpen(false)}>
                <Image src="/icons/tg_logo.png" alt="Telegram" width={40} height={40} className="w-full h-full object-cover" />
              </a>
              <a href="https://www.tiktok.com/@whaleabyss" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden" onClick={() => setIsMobileMenuOpen(false)}>
                <Image src="/icons/tiktok_logo.jpg" alt="TikTok" width={40} height={40} className="w-full h-full object-cover" />
              </a>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
