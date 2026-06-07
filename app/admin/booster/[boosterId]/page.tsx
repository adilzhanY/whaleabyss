"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Hash,
  Percent,
  Wallet,
  CreditCard,
  Cake,
  CalendarDays,
  StickyNote,
  Pencil,
} from "lucide-react";
import OrderStatusBadge from "../../_components/OrderStatusBadge";
import CopyableText, { CopyButton } from "../../_components/CopyableText";
import EditBoosterModal from "./EditBoosterModal";
import DocumentsCard, { type BoosterDocument } from "./DocumentsCard";
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
  username: string | null;
}

interface Payload {
  booster: Booster;
  documents: BoosterDocument[];
  orders: AssignedOrder[];
  stats: { totalOrders: number; completedOrders: number; activeOrders: number };
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

export default function BoosterDetailPage({
  params,
}: {
  params: Promise<{ boosterId: string }>;
}) {
  const { boosterId } = use(params);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

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
    { icon: Percent, label: "Комиссия", value: `${b.commissionPercent}%` },
    { icon: Wallet, label: "Баланс", value: `${Number(b.balance).toLocaleString("ru-RU")} ₽` },
    { icon: Cake, label: "Дата рождения", value: fmtDate(b.birthDate) },
    { icon: CalendarDays, label: "В команде с", value: fmtDate(b.startDate) },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/boosters" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> К списку качеров
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black">
          {b.firstName.charAt(0)}
          {b.lastName.charAt(0)}
        </div>
        <div>
          <h1 className="text-3xl font-black text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
            {b.firstName} {b.lastName}
          </h1>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
              b.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {b.status === "active" ? "Активен" : "Неактивен"}
          </span>
        </div>
        <button
          onClick={() => setEditing(true)}
          title="Редактировать"
          className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          <Pencil className="w-4 h-4" />
          Редактировать
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Всего заказов", value: stats.totalOrders },
          { label: "В работе", value: stats.activeOrders },
          { label: "Завершено", value: stats.completedOrders },
          { label: "Баланс", value: `${Number(b.balance).toLocaleString("ru-RU")} ₽` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="text-2xl font-black text-blue-950">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Данные</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {infoRows.map((r) => (
            <div key={r.label} className="flex items-start gap-3">
              <r.icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-slate-400">{r.label}</div>
                <div className="text-sm text-slate-700 break-words">{r.value}</div>
              </div>
            </div>
          ))}
        </div>
        {b.note && (
          <div className="flex items-start gap-3 mt-4 pt-4 border-t border-slate-100">
            <StickyNote className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-400">Заметка</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{b.note}</div>
            </div>
          </div>
        )}
      </div>

      {/* Documents (agreement + passport scan, private bucket) */}
      <DocumentsCard key={b.id} boosterId={b.id} initialDocuments={documents ?? []} />

      {/* Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider p-6 pb-4">Заказы качера</h2>
        {orders.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-slate-500">Заказов пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr className="text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left font-medium px-6 py-3">ID заказа</th>
                  <th className="text-left font-medium px-6 py-3">Клиент</th>
                  <th className="text-left font-medium px-6 py-3">Статус</th>
                  <th className="text-right font-medium px-6 py-3">Сумма</th>
                  <th className="text-right font-medium px-6 py-3">Заработок</th>
                  <th className="text-right font-medium px-6 py-3">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">
                      <Link href={`/admin/orders/${o.id}`} className="hover:text-indigo-600">
                        {o.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-3">{o.username ?? "— гость —"}</td>
                    <td className="px-6 py-3">
                      <OrderStatusBadge status={o.status ?? "pending"} />
                    </td>
                    <td className="px-6 py-3 text-right font-medium">{Number(o.totalPrice).toLocaleString("ru-RU")} ₽</td>
                    <td className="px-6 py-3 text-right font-medium text-emerald-600">
                      {o.boosterEarning != null ? `+${Number(o.boosterEarning).toLocaleString("ru-RU")} ₽` : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-500 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
