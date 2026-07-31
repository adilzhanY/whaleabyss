"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  UserRound,
  FileText,
  History,
  ChevronLeft,
  LogOut,
  Menu as MenuIcon,
} from "lucide-react";
// The admin switch verbatim: the portal shares the admin theme scope (see the
// #admin-root note in app/portal/layout.tsx), so the same component drives it.
import ThemeSwitch from "@/app/admin/_components/ThemeSwitch";

/**
 * Booster portal shell — same look & behaviour as AdminShell (collapsible
 * sidebar persisted in localStorage, mobile drawer, breadcrumb top bar),
 * with the booster nav set.
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/portal", label: "Дашборд", icon: LayoutDashboard },
  { href: "/portal/profile", label: "Профиль", icon: UserRound },
  { href: "/portal/documents", label: "Документы", icon: FileText },
  { href: "/portal/orders", label: "Прошлые заказы", icon: History },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/portal") return pathname === "/portal";
  return pathname.startsWith(item.href);
}

const SIDEBAR_STATE_KEY = "whaleabyss:portal:sidebar-collapsed";

export default function PortalShell({
  boosterName,
  children,
}: {
  boosterName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Apply the persisted collapsed state after first paint. Scheduled (rAF)
  // rather than set synchronously in the effect body — the server always
  // renders expanded, so this is a deliberate post-hydration correction.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (localStorage.getItem(SIDEBAR_STATE_KEY) === "1") setCollapsed(true);
      setMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
  }, [collapsed, mounted]);

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
          // Desktop: sticky at viewport height, same recipe as AdminShell — as
          // a `static` item the sidebar stretched to the whole document height
          // and scrolled away with the page. `bottom-auto` undoes `inset-y-0`:
          // a sticky box with both top and bottom pinned can't move.
          "lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:self-start",
          "flex flex-col",
          "bg-white border-r border-slate-200",
          "transition-[width,transform] duration-300 ease-out",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20 overflow-hidden">
            {/* Always the white mark: the tile behind it is a fixed dark
                gradient, and /portal is outside the site-dark scope anyway.
                Plain <img>, not next/image — the optimizer rejects SVG unless
                `dangerouslyAllowSVG` is enabled, which would relax that setting
                for every image on the site. */}
            <img
              src="/images/whaleabyss-mark-white.svg"
              alt="Whale Abyss"
              width={40}
              height={40}
              className="w-full h-full object-contain p-1.5"
            />
          </div>
          <div
            className={[
              "overflow-hidden transition-[opacity,max-width] duration-200",
              collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[160px]",
            ].join(" ")}
          >
            <div className="text-[15px] font-semibold tracking-tight whitespace-nowrap">
              Whale Abyss
            </div>
            <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
              Портал качера
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                // Closes the mobile drawer on tap — event-driven, instead of
                // the old watch-pathname effect (a lint-flagged sync setState).
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={[
                  "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
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
              {(boosterName || "К").slice(0, 1).toUpperCase()}
            </div>
            <div
              className={[
                "flex-1 min-w-0 overflow-hidden transition-[opacity,max-width] duration-200",
                collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]",
              ].join(" ")}
            >
              <div className="text-sm font-semibold truncate">{boosterName}</div>
              <div className="text-[11px] text-slate-500 truncate">Качер</div>
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
        <header className="h-16 flex items-center gap-3 px-4 lg:px-8 border-b border-slate-200 bg-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100"
            aria-label="Открыть меню"
          >
            <MenuIcon className="w-5 h-5" strokeWidth={2.25} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wider text-slate-400 font-medium">
              Whale Abyss
            </div>
            <div className="text-sm font-semibold truncate">
              {breadcrumbLabel(pathname)}
            </div>
          </div>
          <ThemeSwitch />
          <button
            onClick={() => router.push("/")}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            title="Вернуться на сайт"
          >
            ← На сайт
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function breadcrumbLabel(pathname: string): string {
  if (pathname === "/portal") return "Дашборд";
  if (pathname.startsWith("/portal/profile")) return "Профиль";
  if (pathname.startsWith("/portal/documents")) return "Документы";
  if (pathname.startsWith("/portal/orders")) return "Прошлые заказы";
  return "Портал";
}
