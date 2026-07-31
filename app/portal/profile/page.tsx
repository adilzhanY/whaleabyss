"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { rub } from "../_components/PortalOrderCard";

/**
 * /portal/profile — the booster's «карточка сотрудника».
 *
 * Legal data stays read-only (changes go through the administrator — that
 * constraint is legal, not technical), but read-only never meant empty: the
 * page is the booster's employment record. Identity + tenure on the brand
 * card, the legal fields grouped by topic («Договор» / «Выплаты») with
 * one-tap copy on the two values people actually take elsewhere (ИНН → tax
 * app, реквизиты → bank), career records, and the monthly earnings chart a
 * самозанятый needs once a month for the tax declaration.
 */

interface Profile {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  inn: string | null;
  payoutDetails: string | null;
  commissionPercent: number;
  startDate: string | null;
}

interface MePayload {
  profile: Profile;
  revenue: { balance: number; totalEarned: number };
  stats: { completedOrders: number };
  records: {
    bestMonth: { month: string; earned: number } | null;
    avgDays: number;
    weekStreak: number;
    avgOrder: number;
  };
  monthly: { month: string; orders: number; earned: number }[];
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

/** «в команде 2 месяца» / «в команде 1 год 3 месяца». */
function tenure(startDate: string | null): string | null {
  if (!startDate) return null;
  const months = Math.max(
    0,
    Math.floor((Date.now() - new Date(startDate).getTime()) / (30.44 * 86_400_000))
  );
  if (months < 1) return "в команде меньше месяца";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const monthsNoun = (n: number) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "месяц";
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "месяца";
    return "месяцев";
  };
  const yearsNoun = (n: number) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "год";
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "года";
    return "лет";
  };
  const parts = [
    years > 0 ? `${years} ${yearsNoun(years)}` : null,
    rest > 0 ? `${rest} ${monthsNoun(rest)}` : null,
  ].filter(Boolean);
  return `в команде ${parts.join(" ")}`;
}

const monthLong = (key: string) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("ru-RU", { month: "long", timeZone: "UTC" });
const monthShort = (key: string) =>
  new Date(`${key}-01T00:00:00Z`)
    .toLocaleDateString("ru-RU", { month: "short", timeZone: "UTC" })
    .replace(".", "");

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — the value stays selectable as text */
    }
  };
  return (
    <button type="button" onClick={copy} className="btn-outline btn-sm !h-7 !gap-1 !px-2.5 text-[11px]">
      <Copy className="h-3 w-3" />
      {copied ? "Скопировано" : "Копировать"}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className="flex items-center gap-2 text-[13.5px] font-bold text-slate-800 tabular-nums">
        {children}
      </span>
    </div>
  );
}

function RecordCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="text-xl font-black tracking-tight text-slate-900 tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-slate-500">{label}</div>
    </div>
  );
}

export default function PortalProfilePage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/me");
        if (res.ok) setMe(await res.json());
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (!me) {
    return <div className="text-center py-24 text-sm text-slate-500">Не удалось загрузить профиль</div>;
  }

  const { profile, revenue, stats, records, monthly } = me;
  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();
  const served = tenure(profile.startDate);
  const hasRecords = stats.completedOrders > 0;
  const maxMonth = Math.max(...monthly.map((m) => m.earned), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {/* ── Identity — fixed brand gradient in both themes, like the sidebar
             logo tile: an accent surface, not a themed one. ── */}
      <div className="relative flex items-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B5191] to-[#1e3a8a] p-6 text-white">
        <div aria-hidden className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/[0.07]" />
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-black">
          {initials}
        </div>
        <div className="min-w-0">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-primary), sans-serif" }}
          >
            {profile.firstName} {profile.lastName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              Качер{served ? ` · ${served}` : ""}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              Доля {profile.commissionPercent}%
            </span>
            {stats.completedOrders > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                {stats.completedOrders} выполненных заказов
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Договор / Выплаты ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
            Договор
          </div>
          <Row label="ФИО">
            {profile.lastName} {profile.firstName}
          </Row>
          <Row label="Дата рождения">{fmtDate(profile.birthDate)}</Row>
          <Row label="ИНН">
            {profile.inn ?? "—"}
            {profile.inn && <CopyButton value={profile.inn} />}
          </Row>
          {/* Read-only is a property of the page, not an error — one quiet
              line instead of the old shouting amber banner. */}
          <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400">
            Юридические данные меняет администратор — напишите ему, если что-то неверно.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
            Выплаты
          </div>
          <Row label="Реквизиты">
            {profile.payoutDetails ?? "—"}
            {profile.payoutDetails && <CopyButton value={profile.payoutDetails} />}
          </Row>
          <Row label="Ваша доля с заказа">{profile.commissionPercent}%</Row>
          <Row label="К выплате сейчас">{rub(revenue.balance)}</Row>
        </div>
      </div>

      {/* ── Рекорды ── */}
      {hasRecords ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {records.bestMonth && (
            <RecordCard
              value={rub(records.bestMonth.earned)}
              label={`лучший месяц (${monthLong(records.bestMonth.month)})`}
            />
          )}
          {records.avgDays > 0 && (
            <RecordCard
              value={`${records.avgDays.toFixed(1).replace(".", ",")} дн.`}
              label="средняя скорость заказа"
            />
          )}
          {records.weekStreak > 1 && (
            <RecordCard value={`${records.weekStreak} нед.`} label="подряд с заказами" />
          )}
          {records.avgOrder > 0 && (
            <RecordCard value={rub(Math.round(records.avgOrder))} label="средний заказ" />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          🐋 Вы в начале пути — рекорды появятся после первых выполненных заказов
        </div>
      )}

      {/* ── Заработок по месяцам ── */}
      {maxMonth > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-[13px] font-bold text-slate-900">Заработок по месяцам</div>
            <div className="text-[11.5px] text-slate-400">
              сумма для декларации самозанятого — за завершённые заказы
            </div>
          </div>
          <div className="mt-4 flex h-28 items-end gap-3">
            {monthly.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                {m.earned > 0 && (
                  <div className="text-[10.5px] font-bold text-slate-500 tabular-nums">
                    {rub(m.earned)}
                  </div>
                )}
                <div
                  className={`w-full max-w-12 rounded-t-lg ${
                    m.earned > 0 ? "bg-gradient-to-b from-blue-400 to-blue-800" : "bg-slate-200"
                  }`}
                  // 4% floor keeps zero months visible as a baseline tick.
                  style={{ height: `${Math.max(4, (m.earned / maxMonth) * 100)}%` }}
                />
                <div className="text-[10.5px] font-semibold text-slate-400">
                  {monthShort(m.month)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
