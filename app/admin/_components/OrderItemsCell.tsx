"use client";

import { useState } from "react";

export interface OrderItemSummary {
  title: string | null;
  quantity: number | null;
  startDate: string | null;
  endDate: string | null;
}

/** How many positions to show before collapsing behind a "+N ещё" toggle. */
const COLLAPSED_COUNT = 2;

/** Lists an order's positions one per line; collapses long lists behind a toggle. */
export default function OrderItemsCell({ items }: { items: OrderItemSummary[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) {
    return <span className="text-slate-300">—</span>;
  }

  const label = (it: OrderItemSummary) => {
    const base = it.title ?? "— услуга удалена —";
    if (it.startDate && it.endDate) {
      const fmt = (d: string) => new Date(d).toLocaleDateString("ru-RU");
      return `${base} (${fmt(it.startDate)}—${fmt(it.endDate)})`;
    }
    return `${base} ×${it.quantity ?? 1}`;
  };

  const hasMore = items.length > COLLAPSED_COUNT;
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);

  return (
    <div
      onClick={hasMore ? () => setExpanded((e) => !e) : undefined}
      className={`max-w-[176px] ${hasMore ? "cursor-pointer" : ""}`}
      title={hasMore ? (expanded ? "Свернуть" : "Показать полностью") : undefined}
    >
      <ul className="text-xs text-slate-600 space-y-0.5">
        {visible.map((it, i) => (
          <li key={i} className={expanded ? "break-words" : "truncate"}>
            {label(it)}
          </li>
        ))}
      </ul>
      {hasMore && (
        <span className="text-[11px] font-medium text-indigo-500">
          {expanded ? "Свернуть" : `+${items.length - COLLAPSED_COUNT} ещё`}
        </span>
      )}
    </div>
  );
}
