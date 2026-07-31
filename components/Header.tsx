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
import LiquidGlassFilter from "./LiquidGlassFilter";
import SocialIcon from "./SocialIcon";
import SiteThemeSwitch from "./SiteThemeSwitch";

interface HeaderProps {
  onAuthOpen: () => void;
}

const LIQUID_GLASS_FILTER_ID = "whaleabyss-header-liquid-glass";

const NAV_LINKS = [
  { label: "Главная", href: "/" },
  { label: "Услуги", href: "/services" },
  { label: "События", href: "/events" },
  { label: "Отзывы", href: "/reviews" },
  { label: "FAQ", href: "/faq" },
  { label: "О сервисе", href: "/info" },
];

// The entrance reveal plays once per full page load. Module scope survives
// client-side route changes (Header remounts per page), so navigating around
// the site never replays it; a hard reload starts a fresh JS session and does.
let hasRevealedThisLoad = false;

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* --------------- Entrance reveal + scroll behavior (option C) ---------- */
  const [reveal, setReveal] = useState(false);
  // Layout effect so the class lands before first paint - otherwise the bar
  // is visible for one frame and then jumps back to its hidden keyframe start.
  useLayoutEffect(() => {
    if (hasRevealedThisLoad) return;
    hasRevealedThisLoad = true;
    setReveal(true);
  }, []);

  // Condensed pill after any scroll; the whole bar slides away on sustained
  // scrolling down and comes back the moment the user scrolls up.
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setScrolled(y > 24);
        const last = lastYRef.current;
        if (y > 160 && y > last + 4) setHidden(true);
        else if (y < last - 4 || y <= 160) setHidden(false);
        lastYRef.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  const headerHidden = hidden && !isMobileMenuOpen;

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
  const glassPanelRef = useRef<HTMLDivElement | null>(null);

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
  // (the active indicator is a 2px rule now, so it carries no shadow)

  const pillTransition = shouldAnimate
    ? "left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1), width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.18s ease, box-shadow 0.18s ease, opacity 0.2s ease"
    : "opacity 0.2s ease";

  return (
    <>
      {/* SVG filter for the liquid-glass refraction. Renders at zero size and
          must be mounted somewhere in the document so backdrop-filter: url(#…)
          can reference it. */}
      <LiquidGlassFilter
        filterId={LIQUID_GLASS_FILTER_ID}
        targetRef={glassPanelRef}
      />

      {/* Floating navbar — fixed, glass, rounded.
          id="site-header" is the scope marker for the public dark theme: the
          `site-dark` CSS block in globals.css only applies inside
          `body:has(#site-header)`, so admin/portal (which never mount this
          Header) are untouched. */}
      <header
        id="site-header"
        className="fixed top-3 left-3 right-3 md:top-5 md:left-6 md:right-6 z-40"
        style={{
          fontFamily: "var(--font-primary), sans-serif",
          transform: headerHidden ? "translateY(-140%)" : "translateY(0)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Full-bleed scrim behind the floating pill. Without it, content
            scrolling past showed through the transparent gutters beside and
            above the pill — titles and prices appeared to run through the
            navbar. Sits behind the pill inside the header's stacking context. */}
        <div
          aria-hidden="true"
          className="site-header-scrim pointer-events-none fixed inset-x-0 top-0 h-24 md:h-28 -z-10"
        />
        <div
          ref={glassPanelRef}
          className={`mx-auto w-full max-w-[75rem] glass-panel liquid-glass transition-[border-radius] duration-300 ${
            scrolled ? "rounded-[20px] md:rounded-[22px]" : "rounded-[28px] md:rounded-[32px]"
          } ${reveal ? "nav-reveal" : ""}`}
          style={{
            // Chromium honors SVG-filter URLs in backdrop-filter; Firefox/Safari
            // drop the whole declaration as invalid and fall back to the plain
            // blur defined on .glass-panel in globals.css.
            backdropFilter: `url(#${LIQUID_GLASS_FILTER_ID})`,
            WebkitBackdropFilter: `blur(18px) saturate(180%)`,
          }}
        >
          <div
            className={`relative flex items-center justify-between pl-3 pr-3 md:pl-5 md:pr-4 transition-[height] duration-300 ${
              scrolled ? "h-12" : "h-14 md:h-16"
            }`}
          >
            {/* Left: burger (mobile/tablet only) + logo (whale icon always,
                brand text on desktop only) */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Wrapper with lg:hidden so cascade specificity can't revive the button on desktop */}
              <div className="lg:hidden nav-reveal-actions">
                <button
                  className="btn-icon !h-10 !w-10 !rounded-full"
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Открыть меню"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>

              {/* Logo lockup. The wordmark is part of the artwork now (Onest
                  ExtraBold, outlined + optically kerned in the brand file), so
                  there is no live text beside it any more. Desktop: lockup on
                  the left. Mobile: the bar holds only burger + profile, so the
                  full lockup fits dead-center (see below).
                  .logo-light/.logo-dark are swapped by theme in globals.css
                  (the site uses `site-dark`, not Tailwind `dark:`). */}
              <Link
                href="/"
                className="hidden lg:flex items-center nav-reveal-logo"
                aria-label="Whale Abyss - на главную"
              >
                <img
                  src="/images/whaleabyss-lockup-ink.svg"
                  alt="Whale Abyss"
                  className={`logo-light w-auto transition-all duration-300 ${scrolled ? "h-7" : "h-9"}`}
                />
                <img
                  src="/images/whaleabyss-lockup-white.svg"
                  alt="Whale Abyss"
                  className={`logo-dark w-auto transition-all duration-300 ${scrolled ? "h-7" : "h-9"}`}
                />
              </Link>
            </div>

            {/* Mobile: full wordmark lockup, dead-center between burger and
                profile (absolute so the flanking buttons can't push it). */}
            <Link
              href="/"
              className="lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 nav-reveal-logo"
              aria-label="Whale Abyss - на главную"
            >
              <img
                src="/images/whaleabyss-lockup-ink.svg"
                alt="Whale Abyss"
                className={`logo-light w-auto transition-all duration-300 ${scrolled ? "h-5" : "h-6"}`}
              />
              <img
                src="/images/whaleabyss-lockup-white.svg"
                alt="Whale Abyss"
                className={`logo-dark w-auto transition-all duration-300 ${scrolled ? "h-5" : "h-6"}`}
              />
            </Link>

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
                  // 2px underline rather than a filled pill: the nav was one
                  // more max-radius shape in a layout where everything was a
                  // pill, so radius carried no hierarchy. Active state now
                  // reads through weight + rule, never opacity.
                  left: pill.left,
                  top: pill.top + pill.height - 2,
                  width: pill.width,
                  height: 2,
                  backgroundColor: "var(--accent-primary)",
                  borderRadius: 2,
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
                    className={`nav-reveal-link relative z-10 px-4 py-2 text-sm transition-colors duration-300 select-none ${
                      isActive ? "font-bold" : "font-medium"
                    }`}
                    style={{
                      color: isActive ? "var(--accent-primary)" : undefined,
                      ["--reveal-i" as string]: i,
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

            {/* Right: actions. The theme switch is a preference, not a feature —
                it sits first, quiet and scaled down, so it stops competing with
                the primary CTA. Cart + auth are one group behind a divider. */}
            <div className="flex items-center gap-2 nav-reveal-actions">
              {/* Mobile bar holds only the profile entry - auth pill and cart
                  live in the burger sheet below lg (per the navbar redesign:
                  burger / centered lockup / profile). */}
              <div className="lg:hidden">
                {session ? (
                  <Link
                    href="/profile"
                    aria-label="Профиль"
                    className="btn-icon !h-10 !w-10 !p-0 !rounded-full overflow-hidden"
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
                    aria-label="Войти или зарегистрироваться"
                    className="btn-icon !h-10 !w-10 !rounded-full"
                  >
                    <User className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-2">
              <div className="opacity-55 transition-opacity hover:opacity-100 scale-90">
                <SiteThemeSwitch />
              </div>
              <span
                aria-hidden="true"
                className="h-6 w-px"
                style={{ backgroundColor: "color-mix(in srgb, currentColor 18%, transparent)" }}
              />
              {session ? (
                <Link
                  href="/profile"
                  aria-label="Профиль"
                  className="btn-icon !p-0 !rounded-full overflow-hidden"
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

              {/* Cart. Was a lone outlined circle with a badge that only existed
                  when the cart was non-empty - so at rest it was an unlabelled
                  icon, and on a services site users can't tell a basket from a
                  shop or an order history. It carries a word from md up and
                  always shows a count (including 0). Same button system and
                  geometry as the sign-in pill next to it; the outline variant
                  keeps the filled pill reading as the primary action. */}
              <button
                onClick={openCart}
                className="btn-outline !gap-2 !px-2.5 md:!px-3"
                aria-label={
                  isMounted && count > 0
                    ? `Корзина, товаров: ${count}`
                    : "Корзина, пусто"
                }
              >
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 shrink-0 text-[var(--accent-primary)]" />
                <span className="hidden md:inline text-sm font-medium">Корзина</span>
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums"
                  style={
                    isMounted && count > 0
                      ? {
                          backgroundColor: "var(--accent-primary)",
                          color: "#fff",
                        }
                      : {
                          backgroundColor:
                            "color-mix(in srgb, currentColor 12%, transparent)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  {isMounted && count > 9 ? "9+" : isMounted ? count : 0}
                </span>
              </button>
              </div>
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
              src="/images/whaleabyss-mark-ink.svg"
              alt="Whale Abyss"
              className="logo-light h-10 w-auto"
            />
            <img
              src="/images/whaleabyss-mark-white.svg"
              alt="Whale Abyss"
              className="logo-dark h-10 w-auto"
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
            {/* The redesigned mobile bar holds only burger + profile, so the
                cart entry point below lg lives here. */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openCart();
              }}
              className="flex items-center justify-between py-3 px-4 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              aria-label={
                isMounted && count > 0
                  ? `Корзина, товаров: ${count}`
                  : "Корзина, пусто"
              }
            >
              <span className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-[var(--accent-primary)]" />
                Корзина
              </span>
              <span
                className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums"
                style={
                  isMounted && count > 0
                    ? { backgroundColor: "var(--accent-primary)", color: "#fff" }
                    : { backgroundColor: "#f1f5f9", color: "#64748b" }
                }
              >
                {isMounted && count > 9 ? "9+" : isMounted ? count : 0}
              </span>
            </button>
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

          <div className="border-t border-slate-100 pt-4 mb-2 flex items-center justify-between px-4">
            <span className="text-sm font-semibold text-slate-700">
              Тёмная тема
            </span>
            <SiteThemeSwitch />
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
                aria-label="Telegram"
                className="group flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <SocialIcon
                  type="telegram"
                  className="w-5 h-5 text-slate-700 group-hover:text-[var(--accent-primary)] transition-colors"
                />
              </a>
              <a
                href="https://www.tiktok.com/@whaleyuureiq"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="group flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <SocialIcon
                  type="tiktok"
                  className="w-5 h-5 text-slate-700 group-hover:text-[var(--accent-primary)] transition-colors"
                />
              </a>
              <a
                href="https://www.twitch.tv/whaleabyssboost"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitch"
                className="group flex items-center justify-center w-10 h-10 bg-[#E2E8F0] rounded-xl hover:shadow-md transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <SocialIcon
                  type="twitch"
                  className="w-5 h-5 text-slate-700 group-hover:text-[var(--accent-primary)] transition-colors"
                />
              </a>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
