"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import Breadcrumb from "@/components/Breadcrumb";
import TelegramIcon from "@/components/TelegramIcon";
import {
  ShieldCheck,
  FileText,
  CreditCard,
  ChevronRight,
  Lock,
  ArrowRight,
} from "lucide-react";
import { LEGAL, getPartyLabel } from "@/lib/legal";
import type { SiteStats } from "@/lib/siteStats";

/** Russian count forms: 1 заказ / 2-4 заказа / 5+ заказов. */
function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** A labelled row of the passport card. */
function PassportRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-5 sm:flex-row sm:gap-4 first:border-t-0">
      <span className="w-28 shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function DocRow({
  href,
  icon: Icon,
  title,
  date,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  date: string;
}) {
  return (
    <Link
      href={href}
      className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50"
        style={{ color: "var(--accent-primary)" }}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold text-slate-900">{title}</span>
      <span className="shrink-0 text-xs text-slate-400">ред. {date}</span>
      <ChevronRight className="size-4 shrink-0 text-slate-300" />
    </Link>
  );
}

/**
 * «О сервисе»: a living header (Вэлль, mission, live figures) above a
 * passport-style document card - executor, payment guarantees, the legal
 * documents with their revision dates, and direct contacts.
 */
export default function InfoClient({ stats }: { stats?: SiteStats }) {
  const [authOpen, setAuthOpen] = useState(false);

  const tiles: { value: string; caption: string }[] = [];
  if (stats?.completedOrders) {
    tiles.push({
      value: String(stats.completedOrders),
      caption: plural(
        stats.completedOrders,
        "выполненный заказ",
        "выполненных заказа",
        "выполненных заказов"
      ),
    });
  }
  if (stats?.rating != null && stats.reviewCount > 0) {
    tiles.push({
      value: stats.rating.toFixed(1).replace(".", ","),
      caption: `рейтинг · ${stats.reviewCount} ${plural(stats.reviewCount, "отзыв", "отзыва", "отзывов")}`,
    });
  }
  tiles.push({ value: "СБП", caption: "безопасная оплата" });

  return (
    <div
      style={{
        backgroundColor: "var(--bg-main)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="flex-1 px-4 pt-28 md:pt-32 pb-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Breadcrumb />

          {/* Living header: the brand face + the mission, not a bare H1. */}
          <div
            className="flex flex-wrap items-center gap-7 rounded-[24px] px-7 py-8 sm:px-9"
            style={{
              background: "linear-gradient(120deg, #0B5191, #1e3a8a 60%, #123a63)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/valle_chibi_happy.png"
              alt=""
              aria-hidden
              className="h-24 w-auto sm:h-28"
              style={{ filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.4))" }}
            />
            <div className="min-w-60 flex-1">
              <h1
                className="mb-2 text-3xl font-black text-white sm:text-4xl"
                style={{ fontFamily: "var(--font-primary), sans-serif" }}
              >
                О сервисе
              </h1>
              <p className="max-w-[56ch] text-[15px] leading-relaxed text-blue-100">
                Whale Abyss - сервис прокачки Genshin Impact. Проверенные бустеры
                закрывают рутину: исследование регионов, Бездна, задания. Аккаунт
                остаётся в безопасности, а данные для входа удаляются после заказа.
              </p>
            </div>
          </div>

          {/* Live figures - only the ones the DB can actually back. */}
          <div
            className="mt-4 grid gap-3"
            style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.caption}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center"
              >
                <span
                  className="block text-2xl font-black text-blue-950"
                  style={{ fontFamily: "var(--font-primary), sans-serif" }}
                >
                  {tile.value}
                </span>
                <span className="text-xs text-slate-500">{tile.caption}</span>
              </div>
            ))}
          </div>

          {/* Passport: one official document instead of three equal cards. */}
          <div className="mt-10 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_44px_-24px_rgba(15,23,42,0.18)]">
            <PassportRow label="Исполнитель">
              <p className="text-sm font-semibold text-slate-900">{getPartyLabel()}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                ИНН <span className="font-mono">{LEGAL.INN}</span> · {LEGAL.ADDRESS}
              </p>
            </PassportRow>

            <PassportRow label="Оплата">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/sbp.png" alt="СБП" className="h-4 w-auto" />
                  через СБП
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <Lock className="size-3.5" />
                  HTTPS/SSL
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  платёжные данные не храним
                </span>
              </div>
              <p className="mt-2 text-[13px] text-slate-500">
                Платежи проходят через защищённые шлюзы банков-партнёров.
              </p>
            </PassportRow>

            <PassportRow label="Документы">
              <DocRow
                href="/privacy"
                icon={ShieldCheck}
                title="Политика конфиденциальности"
                date={LEGAL.PRIVACY_VERSION_DATE}
              />
              <DocRow
                href="/public_offer"
                icon={FileText}
                title="Публичная оферта"
                date={LEGAL.OFFER_VERSION_DATE}
              />
              <DocRow
                href="/payment"
                icon={CreditCard}
                title="Правила оплаты"
                date={LEGAL.PAYMENT_RULES_VERSION_DATE}
              />
            </PassportRow>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5">
              <a
                href={LEGAL.TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary !gap-2 !text-[13.5px]"
              >
                <TelegramIcon className="size-4" />
                Написать в Telegram
              </a>
              <a href={`mailto:${LEGAL.EMAIL}`} className="btn-outline !text-[13.5px]">
                {LEGAL.EMAIL}
              </a>
              <Link
                href="/contacts"
                className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--accent-primary)" }}
              >
                Все контакты
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
