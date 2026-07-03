"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

/** "2026-05" + delta months → "YYYY-MM". */
function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/**
 * ‹ Май 2026 › — dashboard month switcher. Writes `?month=YYYY-MM` so the
 * server component re-queries the selected month. The forward arrow stops at
 * the current month (the future has no orders to show).
 */
export default function MonthSelect({
  month,
  isCurrent,
}: {
  month: string;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [y, m] = month.split("-").map(Number);

  const go = (delta: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", shiftMonth(month, delta));
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  return (
    <div className="inline-flex items-center gap-1 bg-white rounded-xl border border-slate-300 px-1.5 py-1">
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={pending}
        aria-label="Предыдущий месяц"
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="min-w-[7.5rem] text-center text-sm font-medium text-slate-700 select-none">
        {MONTHS[m - 1]} {y}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={pending || isCurrent}
        aria-label="Следующий месяц"
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
