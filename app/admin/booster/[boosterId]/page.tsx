"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Hash,
  CreditCard,
  Cake,
  CalendarDays,
  StickyNote,
  Pencil,
} from "lucide-react";
import OrderStatusBadge from "../../_components/OrderStatusBadge";
import DataTable, { type Column } from "../../_components/DataTable";
import PageHeader from "../../_components/PageHeader";
import { BoosterEarningsChart, type MonthPoint } from "../../_components/DashboardCharts";
import CopyableText, { CopyButton } from "../../_components/CopyableText";
import EditBoosterModal from "./EditBoosterModal";
import DocumentsCard, { type BoosterDocument } from "./DocumentsCard";
import PortalAccessCard from "./PortalAccessCard";
import TelegramIcon from "@/components/TelegramIcon";

interface Booster {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  telegramUsername: string | null;
  inn: string | null;
  payoutDetails: string | null;
  commissionPercent: number;
  balance: string;
  status: "active" | "inactive";
  note: string | null;
  startDate: string | null;
  createdAt: string;
}

interface AssignedOrder {
  id: string;
  status: string;
  totalPrice: string;
  boosterEarning: string | null;
  createdAt: string;
  updatedAt: string | null;
  boosterOnline: boolean;
  username: string | null;
  items: string[];
}

interface Payload {
  booster: Booster;
  linkedEmail: string | null;
  documents: BoosterDocument[];
  orders: AssignedOrder[];
  topServices: { title: string; count: number }[];
  earningsByMonth: MonthPoint[];
  stats: {
    totalOrders: number;
    completedOrders: number;
    activeOrders: number;
    totalEarned: number;
    /** Average completion time in hours; null until something is completed. */
    avgHours: number | null;
    teamAvgHours: number | null;
    customers: number;
    repeatCustomers: number;
  };
}

const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

/** «5,7 дня» — hours read badly once an order takes days, which most do. */
function humanDuration(hours: number | null) {
  if (hours == null) return "—";
  if (hours < 24) return `${Math.round(hours)} ч`;
  const days = hours / 24;
  return `${days.toFixed(1).replace(".", ",")} дн.`;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

export default function BoosterDetailPage({
  params,
}: {
  params: Promise<{ boosterId: string }>;
}) {
  const { boosterId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);

  const orderColumns: Column<AssignedOrder>[] = [
    {
      key: "items",
      header: "Услуги",
      mobileFullWidth: true,
      render: (o) =>
        o.items.length ? (
          <span className="text-[13px] text-slate-700">{o.items.join(", ")}</span>
        ) : (
          <span className="font-mono text-xs text-slate-400">{o.id.slice(0, 8)}</span>
        ),
    },
    { key: "client", header: "Клиент", render: (o) => o.username ?? "— гость —" },
    {
      key: "status",
      header: "Статус",
      render: (o) => <OrderStatusBadge status={o.status ?? "pending"} />,
    },
    {
      key: "total",
      header: "Сумма",
      align: "right",
      render: (o) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {Number(o.totalPrice).toLocaleString("ru-RU")} ₽
        </span>
      ),
    },
    {
      key: "earning",
      header: "Заработок",
      align: "right",
      render: (o) => (
        <span className="whitespace-nowrap font-medium tabular-nums text-emerald-600">
          {o.boosterEarning != null
            ? `+${Number(o.boosterEarning).toLocaleString("ru-RU")} ₽`
            : "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Дата",
      align: "right",
      render: (o) => <span className="whitespace-nowrap text-slate-500">{fmtDate(o.createdAt)}</span>,
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/boosters/${boosterId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) setData(await res.json());
      } catch (error) {
        console.error("Failed to fetch booster:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [boosterId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/boosters" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> К списку качеров
        </Link>
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100 text-slate-500">
          Качер не найден
        </div>
      </div>
    );
  }

  const { booster: b, documents, orders, stats } = data;

  const infoRows: { icon: React.ElementType; label: string; value: React.ReactNode }[] = [
    { icon: Hash, label: "ID", value: <span className="font-mono text-xs">{b.id}</span> },
    {
      icon: TelegramIcon,
      label: "Telegram",
      value: b.telegramUsername ? (
        <span className="inline-flex items-center gap-1.5 max-w-full">
          <a href={`https://t.me/${b.telegramUsername.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline truncate">
            {b.telegramUsername}
          </a>
          <CopyButton value={b.telegramUsername} />
        </span>
      ) : "—",
    },
    {
      icon: Hash,
      label: "ИНН",
      value: b.inn ? <CopyableText value={b.inn} className="font-mono" /> : "—",
    },
    {
      icon: CreditCard,
      label: "Реквизиты",
      value: b.payoutDetails ? <CopyableText value={b.payoutDetails} /> : "—",
    },
    { icon: Cake, label: "Дата рождения", value: fmtDate(b.birthDate) },
    { icon: CalendarDays, label: "В команде с", value: fmtDate(b.startDate) },
  ];

  const activeOrders = orders.filter((o) => o.status === "in_progress");
  const balance = Number(b.balance);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <PageHeader title={`${b.firstName} ${b.lastName}`} subtitle="Качер" />

      <Link href="/admin/boosters" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> К списку качеров
      </Link>

      {/* Hero — the same abyss gradient + star field as the customer /profile
          hero. It carries identity, status and money; everything below is work. */}
      <div className="relative overflow-hidden rounded-2xl p-5 text-white sm:p-6">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#071c33_0%,#0B5191_55%,#1e3a8a_100%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: "url('/images/stars_background.jpg')" }}
        />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-xl font-black">
            {b.firstName.charAt(0)}
            {b.lastName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="text-2xl font-black tracking-tight">
              {b.firstName} {b.lastName}
            </h1>
            <div className="mt-1 text-[12.5px] text-[#c7ddf2]">
              в команде с {fmtDate(b.startDate)} · комиссия {b.commissionPercent}%
              {b.telegramUsername ? ` · ${b.telegramUsername}` : ""}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  b.status === "active" ? "bg-emerald-400/20 text-emerald-100" : "bg-white/15 text-white/80"
                }`}
              >
                {b.status === "active" ? "Активен" : "Неактивен"}
              </span>
              <HeroChip ok={!!data.linkedEmail}>
                {data.linkedEmail ? "Портал привязан" : "Портал не привязан"}
              </HeroChip>
              <HeroChip ok={documents.length === 2}>
                {documents.length === 2
                  ? "Договор и паспорт есть"
                  : documents.length === 1
                    ? "Один документ из двух"
                    : "Документов нет"}
              </HeroChip>
              <HeroChip ok={!!(b.inn && b.payoutDetails)}>
                {b.inn && b.payoutDetails ? "Реквизиты заполнены" : "Нет ИНН или реквизитов"}
              </HeroChip>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {b.telegramUsername && (
              <a
                href={`https://t.me/${b.telegramUsername.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25"
              >
                <TelegramIcon className="h-3.5 w-3.5" />
                Написать
              </a>
            )}
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25"
            >
              <Pencil className="h-3.5 w-3.5" />
              Редактировать
            </button>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap border-t border-white/20 pt-3">
          <HeroStat value={rub(stats.totalEarned)} label="Заработал всего" />
          <HeroStat value={rub(balance)} label="К выплате" />
          <HeroStat
            value={String(stats.totalOrders)}
            label="Заказов"
            sub={`${stats.completedOrders} выполнено${stats.activeOrders ? ` · ${stats.activeOrders} в работе` : ""}`}
          />
          <HeroStat
            value={humanDuration(stats.avgHours)}
            label="Скорость"
            sub={stats.teamAvgHours != null ? `команда ${humanDuration(stats.teamAvgHours)}` : undefined}
          />
          <HeroStat
            value={String(stats.customers)}
            label="Клиентов"
            sub={stats.repeatCustomers > 0 ? `${stats.repeatCustomers} вернулись` : undefined}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* ── left: money and work ─────────────────────────────────────── */}
        <div className="space-y-4">
          <Section title="Заработок по месяцам" right={`всего ${rub(stats.totalEarned)}`}>
            {stats.totalEarned > 0 ? (
              <BoosterEarningsChart data={data.earningsByMonth} />
            ) : (
              <EmptyRow>Комиссий пока не начислялось</EmptyRow>
            )}
          </Section>

          <Section title={`Заказы · ${orders.length}`}>
            {orders.length === 0 ? (
              <EmptyRow>Заказов пока нет</EmptyRow>
            ) : (
              <DataTable
                columns={orderColumns}
                data={orders}
                getRowKey={(o) => o.id}
                dense
                page={ordersPage}
                {...(orders.length > 10 ? { pageSize: 10 } : {})}
                onPageChange={setOrdersPage}
                onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
              />
            )}
          </Section>
        </div>

        {/* ── right: state, speed, specialisation, paperwork ───────────── */}
        <div className="space-y-4">
          <Section title="Сейчас в работе" right={activeOrders.length ? `${activeOrders.length}` : undefined}>
            {activeOrders.length === 0 ? (
              <EmptyRow>Активных заказов нет</EmptyRow>
            ) : (
              <div className="space-y-2.5">
                {activeOrders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="text-[13px] font-semibold text-slate-900">
                      {o.items.length ? o.items.join(", ") : "Без позиций"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {o.username ?? "— гость —"} · {rub(Number(o.totalPrice))} ·{" "}
                      {daysSince(o.createdAt)}
                    </div>
                    {o.boosterOnline && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        Качер на аккаунте
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title="Скорость">
            {stats.avgHours == null ? (
              <EmptyRow>Ещё нет выполненных заказов</EmptyRow>
            ) : (
              <>
                {/* Two bars on one scale beat a single meter: the question is
                    «быстрее или медленнее команды», and that reads instantly. */}
                <SpeedBar
                  label="Этот качер"
                  hours={stats.avgHours}
                  max={Math.max(stats.avgHours, stats.teamAvgHours ?? 0)}
                  accent
                />
                {stats.teamAvgHours != null && (
                  <SpeedBar
                    label="Вся команда"
                    hours={stats.teamAvgHours}
                    max={Math.max(stats.avgHours, stats.teamAvgHours)}
                  />
                )}
                <p className="mt-2.5 text-xs text-slate-500">
                  Среднее время от оплаты до завершения
                  {stats.teamAvgHours != null &&
                    ` · ${stats.avgHours <= stats.teamAvgHours ? "быстрее" : "медленнее"} среднего`}
                </p>
              </>
            )}
          </Section>

          {data.topServices.length > 0 && (
            <Section title="Специализация">
              <div className="space-y-1.5">
                {data.topServices.map((s, i) => (
                  <div key={s.title} className="flex items-center gap-2.5 text-[13px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{s.title}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">×{s.count}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Анкета">
            <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {infoRows.map((r) => (
                <div key={r.label} className="flex items-start gap-2.5">
                  <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400">{r.label}</div>
                    <div className="break-words text-[13px] text-slate-700">{r.value}</div>
                  </div>
                </div>
              ))}
            </div>
            {b.note && (
              <div className="mt-3 flex items-start gap-2.5 border-t border-slate-100 pt-3">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <div className="text-[11px] text-slate-400">Заметка</div>
                  <div className="whitespace-pre-wrap text-[13px] text-slate-700">{b.note}</div>
                </div>
              </div>
            )}
          </Section>

          {/* Documents + portal access collapsed into ONE card: files exist for
              2 boosters out of 7 and the portal is already linked for 5, so at
              full size these two sections were mostly empty chrome. */}
          <Section title="Документы и доступ">
            <DocumentsCard key={b.id} boosterId={b.id} initialDocuments={documents ?? []} bare />
            <div className="my-3 h-px bg-slate-100" />
            <PortalAccessCard
              key={`portal-${b.id}`}
              boosterId={b.id}
              initialEmail={data.linkedEmail ?? null}
              bare
            />
          </Section>
        </div>
      </div>

      {editing && (
        <EditBoosterModal
          booster={b}
          onClose={() => setEditing(false)}
          onSaved={(updated) =>
            setData((prev) => (prev ? { ...prev, booster: { ...prev.booster, ...updated } } : prev))
          }
        />
      )}
    </div>
  );
}

/** Status pill that reads on the dark hero: green when the box is ticked. */
function HeroChip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
        ok
          ? "border border-white/25 bg-white/15 text-[#e0f2fe]"
          : "border border-amber-300/40 bg-amber-400/20 text-amber-100"
      }`}
    >
      {children}
    </span>
  );
}

/** One figure in the hero ribbon. */
function HeroStat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="mr-6 min-w-[110px] border-r border-white/15 pr-6 last:mr-0 last:border-r-0 last:pr-0">
      <div className="text-xl font-extrabold tracking-tight tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#a8c8e8]">
        {label}
      </div>
      {sub && <div className="text-[11px] text-[#c7ddf2]">{sub}</div>}
    </div>
  );
}

/** White card with a tight header — the page's only content shell. */
function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-[13px] font-bold text-slate-900">{title}</h2>
        {right && <span className="shrink-0 text-xs text-slate-500">{right}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** One-line empty state — never a 200px void. */
function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-500">{children}</div>
  );
}

/** «28 дней в работе» — how long an order has been open. */
function daysSince(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "сегодня";
  const mod10 = days % 10;
  const mod100 = days % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "день"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? "дня"
        : "дней";
  return `${days} ${word} в работе`;
}

/** One labelled bar of the speed comparison; both share the same max. */
function SpeedBar({
  label,
  hours,
  max,
  accent = false,
}: {
  label: string;
  hours: number;
  max: number;
  accent?: boolean;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-slate-500">{label}</span>
        <span className={`font-bold tabular-nums ${accent ? "text-slate-900" : "text-slate-600"}`}>
          {humanDuration(hours)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            accent ? "bg-[linear-gradient(90deg,#0b5191,#0ea5e9)]" : "bg-slate-300"
          }`}
          style={{ width: `${max > 0 ? Math.max((hours / max) * 100, 4) : 0}%` }}
        />
      </div>
    </div>
  );
}
