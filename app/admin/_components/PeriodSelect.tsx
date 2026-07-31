"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs } from "@heroui/react";
import type { Period } from "./period";

const SCOPES: { id: Period; label: string }[] = [
  { id: "month", label: "Месяц" },
  { id: "quarter", label: "Квартал" },
  { id: "year", label: "Год" },
];

/**
 * Dashboard scope switcher: месяц / квартал / год + a ‹ › stepper over the
 * chosen scope. Writes `?period=` and `?anchor=YYYY-MM` — the page is a server
 * component, so navigation is what re-queries the data.
 *
 * The scope control is shadcn `Tabs`; the steppers use the shared `.btn-*`
 * spec. Nothing here is a bespoke button.
 */
export default function PeriodSelect({
  period,
  anchor,
  label,
  isCurrent,
}: {
  period: Period;
  /** "YYYY-MM" — the month that identifies the window. */
  anchor: string;
  /** Human label of the current window, e.g. «Июль 2026» / «III квартал 2026». */
  label: string;
  /** True when the window contains today — the forward arrow is then disabled. */
  isCurrent: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const push = (next: { period?: Period; anchor?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", next.period ?? period);
    params.set("anchor", next.anchor ?? anchor);
    // Legacy `?month=` from bookmarks — drop it so it can't fight `anchor`.
    params.delete("month");
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  /** Step by one whole window: 1 month, 3 months or 12 months. */
  const step = (direction: 1 | -1) => {
    const size = period === "month" ? 1 : period === "quarter" ? 3 : 12;
    const [y, m] = anchor.split("-").map(Number);
    const total = y * 12 + (m - 1) + direction * size;
    const ny = Math.floor(total / 12);
    const nm = (total % 12) + 1;
    push({ anchor: `${ny}-${String(nm).padStart(2, "0")}` });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Same HeroUI switcher as the «Войти / Регистрация» tabs in AuthModal.
          Styled with the slate utilities rather than the --bg-* tokens: only
          those are remapped by the `admin-dark` palette. */}
      <Tabs
        selectedKey={period}
        onSelectionChange={(key) => push({ period: key as Period })}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Период" className="rounded-full bg-slate-100">
            {SCOPES.map((scope) => (
              <Tabs.Tab
                key={scope.id}
                id={scope.id}
                className="h-auto rounded-full px-4 py-2 text-sm font-semibold text-slate-500 data-[selected=true]:text-slate-900"
              >
                {scope.label}
                <Tabs.Indicator className="period-tab-indicator rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]" />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {/* Pill, same radius as the Tabs track on the left. `min-w` only sets a
          floor for «Июль 2026» — the box still grows for «III квартал 2026». */}
      <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-white px-1 py-1">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={pending}
          aria-label="Предыдущий период"
          className="btn-ghost btn-sm btn-icon-only"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[7rem] select-none px-1 text-center text-sm font-medium text-slate-700">
          {label}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={pending || isCurrent}
          aria-label="Следующий период"
          className="btn-ghost btn-sm btn-icon-only"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
