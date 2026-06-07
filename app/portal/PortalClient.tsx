"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  Wallet,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Eye,
  Download,
  FileText,
  IdCard,
  Loader2,
  LogOut,
  Hash,
  Percent,
  CreditCard,
  Cake,
  CalendarDays,
  CircleDot,
} from "lucide-react";
import OrderStatusBadge from "../admin/_components/OrderStatusBadge";
import DocumentViewer from "@/components/DocumentViewer";

/**
 * Booster portal UI. Everything here is scoped server-side to the logged-in
 * booster (lib/portalAuth.ts) — the client only renders what /api/portal/*
 * returns. Legal data is read-only; money shown is ONLY the booster's cut.
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

interface PortalDocument {
  id: string;
  docType: "agreement" | "passport";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: string;
}

interface MePayload {
  profile: Profile;
  revenue: { balance: number; totalEarned: number };
  stats: { totalOrders: number; activeOrders: number; completedOrders: number };
  documents: PortalDocument[];
}

interface PortalOrder {
  id: string;
  status: string;
  boosterOnline: boolean;
  earning: number;
  earningCredited: boolean;
  userNotes: string | null;
  createdAt: string;
  items: { title: string | null; quantity: number | null }[];
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

const rub = (v: number) => `${v.toLocaleString("ru-RU")} ₽`;

export default function PortalClient({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [me, setMe] = useState<MePayload | null>(null);
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<PortalDocument | null>(null);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [meRes, ordersRes] = await Promise.all([
        fetch("/api/portal/me"),
        fetch("/api/portal/orders"),
      ]);
      if (meRes.ok) setMe(await meRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (err) {
      console.error("Failed to load portal data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOnline = async (order: PortalOrder) => {
    setBusyOrder(order.id);
    setError(null);
    try {
      const res = await fetch(`/api/portal/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boosterOnline: !order.boosterOnline }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось изменить статус");
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, boosterOnline: data.boosterOnline } : o))
      );
    } catch {
      setError("Не удалось изменить статус");
    } finally {
      setBusyOrder(null);
    }
  };

  const completeOrder = async (order: PortalOrder) => {
    if (!confirm("Завершить заказ? Администратор получит уведомление.")) return;
    setBusyOrder(order.id);
    setError(null);
    try {
      const res = await fetch(`/api/portal/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось завершить заказ");
        return;
      }
      // Refresh both: order status + revenue (commission was just credited).
      await load();
    } catch {
      setError("Не удалось завершить заказ");
    } finally {
      setBusyOrder(null);
    }
  };

  const docUrl = (doc: PortalDocument, download = false) =>
    `/api/portal/documents/${doc.id}${download ? "?download=1" : ""}`;

  const docMeta: Record<PortalDocument["docType"], { title: string; icon: React.ElementType }> = {
    agreement: { title: "Договор", icon: FileText },
    passport: { title: "Паспорт", icon: IdCard },
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Onest, sans-serif" }}>
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Image src="/icon.png" alt="Whale Abyss" width={36} height={36} className="rounded-full" />
          <div>
            <div className="text-sm font-bold text-slate-900">Whale Abyss</div>
            <div className="text-xs text-slate-400">Портал качера</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {firstName} {lastName}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Выйти"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {error && (
              <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Revenue + stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Wallet}
                tone="bg-emerald-50 text-emerald-600"
                label="К выплате"
                value={rub(me?.revenue.balance ?? 0)}
              />
              <StatCard
                icon={TrendingUp}
                tone="bg-blue-50 text-blue-700"
                label="Заработано всего"
                value={rub(me?.revenue.totalEarned ?? 0)}
              />
              <StatCard
                icon={ShoppingBag}
                tone="bg-amber-50 text-amber-600"
                label="В работе"
                value={String(me?.stats.activeOrders ?? 0)}
              />
              <StatCard
                icon={CheckCircle2}
                tone="bg-slate-100 text-slate-600"
                label="Выполнено"
                value={String(me?.stats.completedOrders ?? 0)}
              />
            </div>

            {/* Orders */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Мои заказы</h2>
              <p className="text-xs text-slate-400 mb-5">
                Включайте «Я на аккаунте», когда заходите на аккаунт клиента — клиент видит это в своём заказе.
              </p>
              {orders.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Заказов пока нет</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          № {o.id.slice(0, 8)}
                        </span>
                        <OrderStatusBadge status={o.status} />
                        {o.status === "in_progress" && o.boosterOnline && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                            На аккаунте
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-400">{fmtDate(o.createdAt)}</span>
                      </div>

                      <div className="mt-3 text-sm text-slate-700">
                        {o.items.map((it, idx) => (
                          <div key={idx}>
                            • {it.title ?? "Услуга"} ×{it.quantity ?? 1}
                          </div>
                        ))}
                      </div>

                      {o.userNotes && (
                        <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">
                          {o.userNotes}
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                            {o.earningCredited ? "Начислено" : "Вы получите"}
                          </div>
                          <div className="font-black text-slate-800">{rub(o.earning)}</div>
                        </div>

                        {o.status === "in_progress" && (
                          <div className="ml-auto flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleOnline(o)}
                              disabled={busyOrder === o.id}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                                o.boosterOnline
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  o.boosterOnline ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              />
                              {o.boosterOnline ? "Я на аккаунте" : "Не на аккаунте"}
                            </button>
                            <button
                              type="button"
                              onClick={() => completeOrder(o)}
                              disabled={busyOrder === o.id}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {busyOrder === o.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Завершить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile (read-only legal data) */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Мои данные</h2>
                <p className="text-xs text-slate-400 mb-5">
                  Юридические данные. Для изменения обратитесь к администратору.
                </p>
                {me && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <InfoRow icon={Hash} label="ФИО" value={`${me.profile.firstName} ${me.profile.lastName}`} />
                    <InfoRow icon={Cake} label="Дата рождения" value={fmtDate(me.profile.birthDate)} />
                    <InfoRow icon={Hash} label="ИНН" value={me.profile.inn || "—"} mono />
                    <InfoRow icon={CreditCard} label="Реквизиты" value={me.profile.payoutDetails || "—"} />
                    <InfoRow icon={Percent} label="Комиссия" value={`${me.profile.commissionPercent}%`} />
                    <InfoRow icon={CalendarDays} label="В команде с" value={fmtDate(me.profile.startDate)} />
                  </div>
                )}
              </section>

              {/* Documents */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-5">Мои документы</h2>
                {!me || me.documents.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">Документов пока нет</p>
                ) : (
                  <div className="space-y-3">
                    {me.documents.map((doc) => {
                      const meta = docMeta[doc.docType];
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
                        >
                          <meta.icon className="w-5 h-5 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-700">{meta.title}</div>
                            <div className="text-xs text-slate-400 truncate" title={doc.fileName}>
                              {doc.fileName}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewing(doc)}
                            title="Просмотреть"
                            className="inline-flex items-center p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={docUrl(doc, true)}
                            title="Скачать"
                            className="inline-flex items-center p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      {viewing && (
        <DocumentViewer
          fileName={viewing.fileName}
          mimeType={viewing.mimeType}
          url={docUrl(viewing)}
          downloadUrl={docUrl(viewing, true)}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <div className={`w-10 h-10 rounded-2xl ${tone} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">{value}</div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className={`text-sm text-slate-700 break-words ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}
