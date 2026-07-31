"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ChevronLeft,
  LogOut,
  Menu as MenuIcon,
  TestTube,
  Ticket,
  Calendar,
  Star,
  Users,
  Swords,
} from "lucide-react";
import ThemeSwitch from "./_components/ThemeSwitch";
import { useAdminHeader } from "./_components/PageHeader";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Paths under which this item is considered active (prefix match). */
  matches?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, matches: ["/admin"] },
  { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, matches: ["/admin/orders"] },
  { href: "/admin/users", label: "Юзеры", icon: Users, matches: ["/admin/users"] },
  { href: "/admin/boosters", label: "Качеры", icon: Swords, matches: ["/admin/boosters"] },
  { href: "/admin/services", label: "Услуги", icon: Package, matches: ["/admin/services"] },
  { href: "/admin/promocodes", label: "Промокоды", icon: Ticket, matches: ["/admin/promocodes"] },
  { href: "/admin/events", label: "События", icon: Calendar, matches: ["/admin/events"] },
  { href: "/admin/reviews", label: "Отзывы", icon: Star, matches: ["/admin/reviews"] },
  { href: "/admin/testing", label: "Тестирование", icon: TestTube, matches: ["/admin/testing"] },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/admin") return pathname === "/admin";
  return (item.matches ?? [item.href]).some((p) => pathname.startsWith(p));
}

interface AdminShellProps {
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  children: React.ReactNode;
}

const SIDEBAR_STATE_KEY = "whaleabyss:admin:sidebar-collapsed";

// useLayoutEffect warns when a client component is server-rendered; the
// measurement is browser-only anyway.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function AdminShell({ userName, userEmail, userAvatar, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    title: headerTitle,
    subtitle: headerSubtitle,
    actions: headerActions,
  } = useAdminHeader();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ── Instant navigation ──────────────────────────────────────────────────
  // `navTarget` is the optimistic active tab: set the moment the user presses
  // (mousedown, ~100ms before click even fires), so the pill slides and the
  // tab highlights instantly while Next.js streams the route in. It reconciles
  // with the real pathname as soon as navigation lands.
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const lastNav = useRef<{ href: string; t: number }>({ href: "", t: 0 });

  useEffect(() => {
    setNavTarget(null);
  }, [pathname]);

  /**
   * `at` is the DOM event's `timeStamp` — same time origin as
   * `performance.now()`, but read from the event instead of called inside the
   * component, which is what the react-hooks purity rule (rightly) rejects.
   */
  const go = (href: string, at: number) => {
    // Both mousedown and the follow-up click call go(); dedupe the pair.
    if (lastNav.current.href === href && at - lastNav.current.t < 600) return;
    lastNav.current = { href, t: at };
    setNavTarget(href);
    router.push(href);
  };

  const activeItem = navTarget
    ? NAV_ITEMS.find((i) => i.href === navTarget) ?? null
    : NAV_ITEMS.find((i) => isActive(i, pathname)) ?? null;

  // ── Sliding pill indicator ──────────────────────────────────────────────
  // One absolutely-positioned pill behind the links, moved with a CSS
  // transition on top/height — measured from the DOM so it survives any
  // future item reordering, wrapping, or size changes.
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);

  useIsoLayoutEffect(() => {
    if (!activeItem) {
      setPill(null);
      return;
    }
    const el = navRef.current?.querySelector<HTMLElement>(
      `[data-href="${activeItem.href}"]`
    );
    if (el) setPill({ top: el.offsetTop, height: el.offsetHeight });
  }, [activeItem, collapsed]);

  // Persist sidebar collapsed state across page navigations.
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (saved === "1") setCollapsed(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
  }, [collapsed, mounted]);

  // Close mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarWidth = collapsed ? "w-[76px]" : "w-[248px]";

  return (
    <div
      className="min-h-screen flex bg-slate-50 text-slate-900"
      style={{ fontFamily: "Onest, sans-serif" }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40",
          // Desktop: sticky at viewport height instead of a plain flex column.
          // As a `static` item it stretched to the height of the whole document,
          // so on a long page «Свернуть» and the logout button sat far below the
          // fold. `bottom-auto` undoes `inset-y-0` — a sticky box with both
          // offsets set never sticks; `self-start` keeps the flex row from
          // stretching it back to full height.
          "lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:self-start",
          "flex flex-col",
          "bg-white border-r border-slate-200",
          "transition-[width,transform] duration-300 ease-out",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Admin identity */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white text-sm font-semibold flex items-center justify-center shrink-0 overflow-hidden">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              (userName || "A").slice(0, 1).toUpperCase()
            )}
          </div>
          <div
            className={[
              "min-w-0 overflow-hidden transition-[opacity,max-width] duration-200",
              collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[160px]",
            ].join(" ")}
          >
            <div className="text-[15px] font-semibold tracking-tight whitespace-nowrap truncate">
              {userName}
            </div>
            <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
              Админ-панель
            </div>
          </div>
        </div>

        {/* Nav — pill items with one sliding active indicator */}
        {/* `overflow-y-auto`: on a short viewport the nav scrolls on its own so
            the collapse + logout footer below stays reachable. */}
        <nav ref={navRef} className="relative flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = activeItem?.href === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-href={item.href}
                title={collapsed ? item.label : undefined}
                onMouseEnter={() => router.prefetch(item.href)}
                onTouchStart={() => router.prefetch(item.href)}
                onMouseDown={(e) => {
                  if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                    go(item.href, e.timeStamp);
                  }
                }}
                onClick={(e) => {
                  // Let cmd/ctrl/shift-click and middle-click do their browser thing.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  go(item.href, e.timeStamp); // no-op if mousedown already navigated; handles keyboard Enter
                }}
                className={[
                  "group relative z-10 flex items-center gap-3 rounded-full px-3.5 py-2.5 transition-colors duration-200",
                  active
                    ? "text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                <Icon
                  className="w-[20px] h-[20px] shrink-0"
                  strokeWidth={active ? 2.25 : 2}
                />
                <span
                  className={[
                    "text-sm font-medium whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200",
                    collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[180px]",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
          {/* Last in DOM so nav's space-y-1 spacing is unaffected by its
              mount; z-0 keeps it painted behind the z-10 links. */}
          {pill && (
            <div
              aria-hidden
              className="admin-nav-pill absolute left-3 right-3 z-0 rounded-full bg-slate-900 shadow-sm transition-[top,height] duration-300 ease-[cubic-bezier(0.35,1.1,0.4,1)]"
              style={{ top: pill.top, height: pill.height, marginTop: 0 }}
            />
          )}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title={collapsed ? "Развернуть" : "Свернуть"}
          >
            <ChevronLeft
              className={[
                "w-5 h-5 transition-transform duration-300",
                collapsed ? "rotate-180" : "rotate-0",
              ].join(" ")}
              strokeWidth={2.25}
            />
            <span
              className={[
                "text-sm font-medium whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200",
                collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[120px]",
              ].join(" ")}
            >
              Свернуть
            </span>
          </button>

          {/* User card + logout */}
          <div
            className={[
              "rounded-2xl bg-slate-50 border border-slate-200 p-2.5 flex items-center gap-2.5",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white text-sm font-semibold flex items-center justify-center shrink-0">
              {(userName || "A").slice(0, 1).toUpperCase()}
            </div>
            <div
              className={[
                "flex-1 min-w-0 overflow-hidden transition-[opacity,max-width] duration-200",
                collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]",
              ].join(" ")}
            >
              <div className="text-sm font-semibold truncate">{userName}</div>
              <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Выйти"
              className={[
                "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                "text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors",
                collapsed ? "hidden" : "flex",
              ].join(" ")}
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — mostly for mobile hamburger + page title breadcrumb. */}
        <header className="h-16 flex items-center gap-3 px-4 lg:px-8 border-b border-slate-200 bg-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100"
            aria-label="Открыть меню"
          >
            <MenuIcon className="w-5 h-5" strokeWidth={2.25} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold tracking-tight leading-tight truncate">
              {headerTitle ?? pageTitle(pathname)}
            </div>
            {headerSubtitle != null && (
              <div className="text-xs text-slate-500 truncate">
                {headerSubtitle}
              </div>
            )}
          </div>
          {headerActions}
          <ThemeSwitch />
          <button
            onClick={() => router.push("/")}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            title="Вернуться на сайт"
          >
            ← На сайт
          </button>
        </header>

        <main className="flex-1 p-4 lg:px-8 lg:py-4">{children}</main>
      </div>
    </div>
  );
}

// Static page titles by route; pages with dynamic titles (order number,
// booster name…) override via <PageHeader title=… /> → useAdminHeader.
function pageTitle(pathname: string): string {
  if (pathname === "/admin") return "Обзор";
  if (pathname === "/admin/orders/new") return "Ручной заказ";
  if (pathname.startsWith("/admin/orders/")) return "Заказ";
  if (pathname.startsWith("/admin/orders")) return "Заказы";
  if (pathname.startsWith("/admin/users/") && pathname !== "/admin/users") return "Профиль пользователя";
  if (pathname.startsWith("/admin/users")) return "Управление пользователями";
  if (pathname === "/admin/boosters/new") return "Новый качер";
  if (pathname.startsWith("/admin/boosters")) return "Качеры";
  if (pathname.startsWith("/admin/booster/")) return "Качер";
  if (pathname === "/admin/services/new") return "Новая услуга";
  if (pathname === "/admin/services/categories") return "Категории услуг";
  if (pathname.startsWith("/admin/services/")) return "Редактирование услуги";
  if (pathname.startsWith("/admin/services")) return "Услуги";
  if (pathname === "/admin/promocodes/new") return "Новый промокод";
  if (pathname.startsWith("/admin/promocodes")) return "Промокоды";
  if (pathname === "/admin/events/new") return "Новое событие";
  if (pathname.startsWith("/admin/events/")) return "Редактировать событие";
  if (pathname.startsWith("/admin/events")) return "События";
  if (pathname === "/admin/reviews/new") return "Новый фейк отзыв";
  if (pathname.startsWith("/admin/reviews")) return "Управление отзывами";
  if (pathname === "/admin/testing/new") return "Новая тестовая услуга";
  if (pathname === "/admin/testing/checkout") return "Тест оплаты";
  if (pathname.startsWith("/admin/testing")) return "Тестирование";
  return "Админ-панель";
}
