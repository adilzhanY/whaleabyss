"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import valleSad from "@/public/images/valle_chibi_sad.png";

/**
 * Shared shells for the profile sections.
 *
 * Every section is a permanently visible card — the page previously hid its
 * content behind two mutually exclusive toggles and looked broken on arrival.
 */

export function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden border border-slate-200 bg-white shadow-sm ${className}`}
      style={{ borderRadius: "var(--r-card)" }}
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6">
        <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-blue-950">
          {icon}
          {title}
        </h2>
        {action}
      </header>
      <div className="px-5 pb-5 pt-3 sm:px-6">{children}</div>
    </section>
  );
}

/**
 * Empty states carry the mascot rather than a bare line of grey text — a new
 * customer's profile is otherwise the emptiest screen on the site.
 */
export function EmptyState({
  text,
  ctaLabel,
  ctaHref,
}: {
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-7 text-center">
      <Image src={valleSad} alt="" className="h-auto w-16 opacity-80" />
      <p className="max-w-xs text-sm text-slate-500">{text}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary btn-sm">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

/** A labelled read-only row of the personal-data card. */
export function DataRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-slate-100 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-44 shrink-0 text-xs font-semibold text-slate-500">{label}</span>
      {value ? (
        <span className="min-w-0 break-words text-sm font-semibold text-slate-900">{value}</span>
      ) : (
        <span className="text-sm italic text-slate-400">не указано</span>
      )}
    </div>
  );
}

/** A row of the security card: icon, label, subtitle, trailing control. */
export function SettingRow({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/** Russian count forms: 1 заказ / 2-4 заказа / 5+ заказов. */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/**
 * Genitive month names. `toLocaleDateString('ru-RU', {month:'long'})` returns
 * the nominative ("июль"), which is wrong after a preposition — «С нами с
 * июль 2025» instead of «с июля 2025». Intl only switches to the genitive when
 * a day is also formatted, and we don't want the day here.
 */
const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export function formatMonthYear(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", opts ?? { day: "numeric", month: "long", year: "numeric" });
}

export function formatMoney(value: string | number) {
  const n = Number(value);
  return `${Number.isFinite(n) ? n.toLocaleString("ru-RU") : value} ₽`;
}
