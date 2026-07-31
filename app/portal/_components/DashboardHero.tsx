"use client";

import { rub } from "./PortalOrderCard";

/**
 * The dashboard's «касса»: money as a story instead of four equal stat tiles.
 *
 * «К выплате» is the number a booster opens the portal for, so it is set like
 * a salary — large, on the brand gradient — with the week's delta and a
 * 14-day sparkline under it: the sum should read as GROWING, not as lying
 * there. The side column carries the goal-gradient card (people speed up when
 * a round number is near) and the demoted counters as chips. Below, a thin
 * «путь» strip shows the whole road of completed-order milestones.
 *
 * The gradient card keeps fixed brand colours in both themes on purpose —
 * like the sidebar logo tile, it is an accent surface, not a themed one.
 */

export interface RevenuePayload {
  balance: number;
  totalEarned: number;
  weekEarned: number;
  daily: { day: string; earned: number }[];
}

export interface StatsPayload {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
}

/** Completed-order milestones the «путь» strip is graded in. */
const MILESTONES = [10, 25, 50, 100, 250, 500];

function nextMilestone(completed: number): number {
  return MILESTONES.find((m) => m > completed) ?? completed + 100;
}

/**
 * Position on the strip: milestones are spaced evenly (a linear scale would
 * park everyone under 100 in the first pixels), progress interpolates within
 * the current segment.
 */
function pathPercent(completed: number): number {
  if (completed <= 0) return 0;
  const idx = MILESTONES.findIndex((m) => m > completed);
  if (idx === -1) return 100;
  const lower = idx === 0 ? 0 : MILESTONES[idx - 1];
  const fraction = (completed - lower) / (MILESTONES[idx] - lower);
  return Math.min(100, ((idx + fraction) / MILESTONES.length) * 100);
}

export default function DashboardHero({
  revenue,
  stats,
}: {
  revenue: RevenuePayload;
  stats: StatsPayload;
}) {
  const goal = nextMilestone(stats.completedOrders);
  const left = goal - stats.completedOrders;
  const goalPct = Math.round((stats.completedOrders / goal) * 100);
  const maxDay = Math.max(...revenue.daily.map((d) => d.earned), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3">
        {/* ── К выплате ── */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br from-[#0B5191] to-[#1e3a8a]">
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.07]"
          />
          <div className="text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-white/70">
            Заработано
          </div>
          {/* totalEarned, NOT balance: money is «заработано» only when the
              order is COMPLETED (creditBoosterForCompletedOrder refuses any
              other status; paid/in-progress orders credit nothing). Unlike the
              balance it never drops on payout day, so the headline number only
              ever grows. The unpaid remainder lives in the «К выплате» chip. */}
          <div className="mt-1 text-4xl sm:text-[2.65rem] font-black leading-none tracking-tight tabular-nums">
            {rub(revenue.totalEarned)}
          </div>
          {revenue.weekEarned > 0 ? (
            <div className="mt-1.5 text-[13.5px] font-semibold text-emerald-300">
              ▲ +{rub(revenue.weekEarned)} за эту неделю
            </div>
          ) : (
            <div className="mt-1.5 text-[13px] text-white/60">
              Завершайте заказы — рост появится здесь
            </div>
          )}
          {maxDay > 0 && (
            <div className="mt-4 flex h-11 items-end gap-[3px]" aria-hidden>
              {revenue.daily.map((d, i) => (
                <div
                  key={d.day}
                  className={`flex-1 rounded-t-[3px] ${
                    i >= revenue.daily.length - 7 && d.earned > 0
                      ? "bg-emerald-300"
                      : "bg-white/25"
                  }`}
                  // 8% floor keeps empty days visible as a baseline tick.
                  style={{ height: `${Math.max(8, (d.earned / maxDay) * 100)}%` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Цель + счётчики ── */}
        <div className="flex flex-col gap-3">
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="text-[13px] font-bold text-slate-900">
              🏁 До {goal}-го выполненного заказа
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-[width] duration-700"
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              <b className="text-slate-900">
                {stats.completedOrders} из {goal}
              </b>
              {left === 1 ? " — остался один. Юбилей сегодня?" : ` — осталось ${left}`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              В работе · {stats.activeOrders}
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Выполнено · {stats.completedOrders}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 tabular-nums">
              К выплате · {rub(revenue.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Путь качера — тонкая строка ── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="text-[13px] font-bold text-slate-900">🐋 Путь качера</span>
          <span className="text-xs text-slate-500">
            следующая веха — <b className="text-slate-900">{goal} заказов</b>
          </span>
        </div>
        <div className="relative mt-2.5 h-2 rounded-full bg-slate-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-700"
            style={{ width: `${pathPercent(stats.completedOrders)}%` }}
          />
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-700 shadow"
            style={{ left: `${pathPercent(stats.completedOrders)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-slate-400">
          {MILESTONES.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
