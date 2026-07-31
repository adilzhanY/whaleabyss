"use client";

import { CheckCircle2, CircleDot, Loader2 } from "lucide-react";
import OrderStatusBadge from "../../admin/_components/OrderStatusBadge";

/**
 * One assigned order in the portal. Money shown is ONLY the booster's cut.
 * Action buttons (online toggle + complete) appear for in_progress orders
 * when the handlers are provided (dashboard); past-order lists omit them.
 */

export interface PortalOrder {
  id: string;
  /** Customer's account id — the only customer identifier the portal shows. */
  userId: string | null;
  status: string;
  boosterOnline: boolean;
  earning: number;
  earningCredited: boolean;
  userNotes: string | null;
  createdAt: string;
  items: {
    title: string | null;
    quantity: number | null;
    /** Per-day services carry their booked period (ISO strings over the wire). */
    startDate?: string | null;
    endDate?: string | null;
  }[];
}

export const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

export const rub = (v: number) => `${v.toLocaleString("ru-RU")} ₽`;

export default function PortalOrderCard({
  order: o,
  busy = false,
  onToggleOnline,
  onComplete,
}: {
  order: PortalOrder;
  busy?: boolean;
  onToggleOnline?: (order: PortalOrder) => void;
  onComplete?: (order: PortalOrder) => void;
}) {
  const actionable = o.status === "in_progress" && (onToggleOnline || onComplete);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
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

        {actionable && (
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {onToggleOnline && (
              <button
                type="button"
                onClick={() => onToggleOnline(o)}
                disabled={busy}
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
            )}
            {onComplete && (
              <button
                type="button"
                onClick={() => onComplete(o)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Завершить
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
