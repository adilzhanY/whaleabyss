"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/useCart";

interface HeaderProps {
  onAuthOpen: () => void;
}

export default function Header({ onAuthOpen }: HeaderProps) {
  const { cartCount, openCart } = useCart();
  const count = cartCount();

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
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 font-bold text-xl" style={{ color: "var(--accent-primary)", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
          <img src="/icons/whale_abyss_logo.jpg" alt="Whale Abyss" className="h-11 w-11 rounded-full object-cover" />
          <span>Whale Abyss</span>
        </a>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {[
            { label: "Главная", href: "/" },
            { label: "Услуги", href: "/#services" },
            { label: "Отзывы", href: "/reviews" },
            { label: "FAQ", href: "/faq" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#4f46e5]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onAuthOpen}
            className="hidden sm:inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{
              backgroundColor: "var(--accent-primary)",
              borderRadius: "var(--btn-radius)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary)")}
          >
            Войти / Регистрация
          </button>

          {/* Cart icon */}
          <button
            onClick={openCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: "var(--bg-highlight)" }}
            aria-label="Корзина"
          >
            <ShoppingCart className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
            {count > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
