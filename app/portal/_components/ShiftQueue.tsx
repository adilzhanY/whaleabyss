"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import CopyableText from "../../admin/_components/CopyableText";
import { rub, type PortalOrder } from "./PortalOrderCard";

/**
 * «Смена» — active orders as a work queue, not a gallery of cards.
 *
 * Oldest first, with the waiting time as the row's leading figure: the
 * unfinished task should press a little (Zeigarnik working for us), and a
 * client must never quietly wait a week. The top row is highlighted — that is
 * the next thing to do; the sorting decides, not the booster.
 *
 * The customer appears ONLY as a copyable account id — no contacts on screen
 * (same policy as the past-orders table); the id is what the booster hands to
 * the admin when asking about a client. The everyday view has exactly two
 * actions: «Я на аккаунте» and «Завершить».
 */

const MS_DAY = 86_400_000;

function daysWaiting(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / MS_DAY) : 0;
}

/** «день / дня / дней» for the age block. */
function daysNoun(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "день ждёт";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "дня ждёт";
  return "дней ждёт";
}

function AgeBlock({ days }: { days: number }) {
  // Amber from day 5: pressure, not punishment — the label stays factual.
  const hot = days >= 5;
  return (
    <div className="w-16 shrink-0 text-center">
      <div className={`text-xl font-black leading-none ${hot ? "text-amber-600" : "text-slate-900"}`}>
        {days === 0 ? "сег." : days}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {days === 0 ? "взят" : daysNoun(days)}
      </div>
    </div>
  );
}

export default function ShiftQueue({
  orders,
  busyOrderId,
  onToggleOnline,
  onComplete,
}: {
  orders: PortalOrder[];
  busyOrderId: string | null;
  onToggleOnline: (order: PortalOrder) => void;
  onComplete: (order: PortalOrder) => void;
}) {
  const queue = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Сейчас нет заказов в работе — новые появятся здесь, как только админ их назначит
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {queue.map((o, idx) => {
        const busy = busyOrderId === o.id;
        const days = daysWaiting(o.createdAt);
        return (
          <div
            key={o.id}
            className={[
              idx > 0 ? "border-t border-slate-100" : "",
              // The head of the queue is the next thing to do.
              idx === 0 ? "border-l-[3px] border-l-blue-800 bg-blue-800/[0.03]" : "",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
              <AgeBlock days={days} />

              <div className="min-w-0 flex-1 basis-52">
                <div className="text-sm font-semibold leading-snug text-slate-800">
                  {o.items.map((it, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-slate-300"> · </span>}
                      {it.title ?? "Услуга"}
                      {(it.quantity ?? 1) > 1 && (
                        <span className="font-medium text-slate-400"> ×{it.quantity}</span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <CopyableText
                    value={o.id}
                    className="font-mono text-[11px] font-bold uppercase text-slate-400"
                  >
                    <span>№ {o.id.slice(0, 8)}</span>
                  </CopyableText>
                  {o.userId && (
                    <CopyableText
                      value={o.userId}
                      className="font-mono text-[11px] font-bold uppercase text-slate-400"
                    >
                      <span>клиент {o.userId.slice(0, 8)}</span>
                    </CopyableText>
                  )}
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">
                    вы получите {rub(o.earning)}
                  </span>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleOnline(o)}
                  disabled={busy}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    o.boosterOnline
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${o.boosterOnline ? "bg-emerald-500" : "bg-slate-300"}`}
                  />
                  {o.boosterOnline ? "На аккаунте" : "Я на аккаунте"}
                </button>
                <button
                  type="button"
                  onClick={() => onComplete(o)}
                  disabled={busy}
                  className="btn-primary btn-sm"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Завершить
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
