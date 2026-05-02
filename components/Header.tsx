"use client";

import { ShoppingCart, Menu, X, User } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import Image from "next/image";

interface HeaderProps {
  onAuthOpen: () => void;
}

const NAV_LINKS = [
  { label: "Главная", href: "/" },
  { label: "Услуги", href: "/services" },
  { label: "Отзывы", href: "/reviews" },
  { label: "FAQ", href: "/faq" },
  { label: "О сервисе", href: "/info" },
];

/**
 * Resolve which nav link is active for the current pathname.
 * The root "/" must match exactly; every other link matches a prefix so that
 * nested routes (e.g. `/services/whatever`) keep the parent highlighted.
 */
function findActiveIndex(
  pathname: string | null,
  links: { href: string }[]
): number {
  if (!pathname) return -1;
  if (pathname === "/") return links.findIndex((l) => l.href === "/");
  // Prefer the longest matching prefix (so `/info` beats `/`).
  let bestIdx = -1;
  let bestLen = -1;
  links.forEach((l, i) => {
    if (l.href === "/") return;
    if (pathname === l.href || pathname.startsWith(l.href + "/")) {
      if (l.href.length > bestLen) {
        bestLen = l.href.length;
        bestIdx = i;
      }
    }
  });
  return bestIdx;
}

export default function Header({ onAuthOpen }: HeaderProps) {
  const pathname = usePathname();
  const { cartCount, openCart } = useCart();
  const count = cartCount();
  const { data: session } = useSession();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen]);

  const desktopLinks = session
    ? [...NAV_LINKS, { label: "Заказы", href: "/orders" }]
    : NAV_LINKS;

  const activeIndex = findActiveIndex(pathname, desktopLinks);

  /* ------------------------- Sliding pill indicator ---------------------- */
  const linksRef = useRef<Array<HTMLAnchorElement | null>>([]);
  const navRef = useRef<HTMLElement | null>(null);

  const [pill, setPill] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [pillVisible, setPillVisible] = useState(false);
  // First measurement should snap into place without sliding from (0,0).
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const measurePill = useCallback(() => {
    const nav = navRef.current;
    const el = linksRef.current[activeIndex];
    if (!nav || !el || activeIndex < 0) {
      setPillVisible(false);
      return;
    }
    const parentRect = nav.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setPill({
      left: rect.left - parentRect.left,
      top: rect.top - parentRect.top,
      width: rect.width,
      height: rect.height,
    });
    setPillVisible(true);
  }, [activeIndex]);

  useLayoutEffect(() => {
    measurePill();
  }, [measurePill, pathname, session]);

  useEffect(() => {
    if (!pillVisible || shouldAnimate) return;
    // Enable transitions on the next frame after first placement.
    const id = requestAnimationFrame(() => setShouldAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [pillVisible, shouldAnimate]);

  useEffect(() => {
    const onResize = () => measurePill();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measurePill]);

  const pillTransform = pressed
    ? "translateY(1px) scale(0.98)"
    : hover
      ? "translateY(-1px)"
      : "translateY(0)";
  const pillShadow =
    hover && !pressed
      ? "var(--shadow-btn-primary-hover)"
      : "var(--shadow-btn-primary)";

  const pillTransition = shouldAnimate
    ? "left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1), width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.18s ease, box-shadow 0.18s ease, opacity 0.2s ease"
    : "opacity 0.2s ease";

  return (
    <>
      {/* Floating navbar — fixed, glass, rounded. */}
      <header
        className="fixed top-3 left-3 right-3 md:top-5 md:left-6 md:right-6 z-40"
        style={{ fontFamily: "var(--font-primary), sans-serif" }}
      >
        <div className="mx-auto w-full max-w-[75rem] glass-panel rounded-[28px] md:rounded-[32px]">
          <div className="flex h-14 md:h-16 items-center justify-between pl-3 pr-3 md:pl-5 md:pr-4">
            {/* Left: burger (mobile/tablet only) + logo */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Wrapper with lg:hidden so cascade specificity can't revive the button on desktop */}
              <div className="lg:hidden">
                <button
                  className="btn-icon !h-10 !w-10 !rounded-xl"
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Открыть меню"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>

              <Link
                href="/"
                className="flex items-center gap-2.5 font-bold text-xl"
                style={{ color: "var(--accent-primary)" }}
              >
                <img
                  src="/icons/whale_logo_circle.png"
                  alt="Whale Abyss"
                  className="h-9 w-9 md:h-11 md:w-11 object-contain"
                />
                <span className="hidden lg:inline-block font-display tracking-tight">
                  Whale Abyss
                </span>
              </Link>
            </div>

            {/* Desktop nav with sliding pill indicator */}
            <nav
              ref={navRef}
              className="hidden lg:flex items-center gap-1 relative"
              style={{ color: "var(--text-secondary)" }}
            >
              {/* Sliding pill (background behind the active link) */}
              <div
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  left: pill.left,
                  top: pill.top,
                  width: pill.width,
                  height: pill.height,
                  backgroundColor: "var(--accent-primary)",
                  border:
                    "1px solid color-mix(in srgb, var(--accent-primary) 88%, #000)",
                  borderRadius: 9999,
                  boxShadow: pillShadow,
                  opacity: pillVisible ? 1 : 0,
                  transform: pillTransform,
                  transition: pillTransition,
                  zIndex: 0,
                }}
              />

              {desktopLinks.map((link, i) => {
                const isActive = i === activeIndex;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    ref={(el) => {
                      linksRef.current[i] = el;
                    }}
                    className="relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 select-none"
                    style={{
                      color: isActive ? "#fff" : undefined,
                    }}
                    onMouseEnter={() => {
                      if (isActive) setHover(true);
                    }}
                    onMouseLeave={() => {
                      if (isActive) {
                        setHover(false);
                        setPressed(false);
                      }
                    }}
                    onMouseDown={() => {
                      if (isActive) setPressed(true);
                    }}
                    onMouseUp={() => {
                      if (isActive) setPressed(false);
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              {session ? (
                <Link
                  href="/profile"
                  aria-label="Профиль"
                  className="btn-icon !p-0 overflow-hidden"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-bold uppercase"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {session.user?.name ? (
                        session.user.name.charAt(0)
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                  )}
                </Link>
              ) : (
                <button
                  onClick={onAuthOpen}
                  className="btn-primary !px-3 md:!px-4 !py-2 !text-xs md:!text-sm"
                >
                  <span className="hidden sm:inline">Войти / Регистрация</span>
                  <span className="inline sm:hidden">Войти</span>
                </button>
              )}

              <button
                onClick={openCart}
                className="btn-icon relative"
                aria-label="Корзина"
              >
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                {count > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full text-[9px] md:text-[10px] font-bold text-white"
                    style={{
                      backgroundColor: "var(--accent-primary)",
                      boxShadow: "var(--shadow-btn-primary)",
                    }}
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isMobileMenuOpen
            ? "opacity-100 block"
            : "opacity-0 hidden pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile menu panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[82%] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ fontFamily: "var(--font-primary), sans-serif" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <img
              src="/icons/whale_logo_circle.png"
              alt="Whale Abyss Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="font-bold text-slate-800 text-lg">Меню</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="btn-icon btn-icon-danger !h-10 !w-10 !rounded-xl"
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            {[
              ...NAV_LINKS,
              ...(session ? [{ label: "Заказы", href: "/orders" }] : []),
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block py-3 px-4 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Правовая информация
            </p>
            <Link
              href="/privacy"
              className="block py-2.5 px-4 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Политика конфиденциальности
            </Link>
            <Link
              href="/public_offer"
              className="block py-2.5 px-4 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Пользовательское соглашение
            </Link>
            <Link
              href="/contacts"
              className="block py-2.5 px-4 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Контакты поддержки
            </Link>
          </div>

          <div className="mt-auto border-t border-slate-100 pt-6">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Мы в соцсетях
            </p>
            <div className="flex gap-4 px-4">
              <a
                href="https://t.me/whaleabyss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Image
                  src="/icons/tg_logo.png"
                  alt="Telegram"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </a>
              <a
                href="https://www.tiktok.com/@whaleyuureiq"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all overflow-hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Image
                  src="/icons/tiktok_logo.jpg"
                  alt="TikTok"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </a>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
