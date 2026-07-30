"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { getOrderStatusMeta } from "@/lib/orderStatus";
import type { ProfileOrder } from "@/lib/profileOverview";
import { EmptyState, SectionCard, formatDate, formatMoney, plural } from "./ui";

export function StatsRow({
  completedOrders,
  activeOrders,
  reviewCount,
}: {
  completedOrders: number;
  activeOrders: number;
  reviewCount: number;
}) {
  const tiles = [
    {
      value: completedOrders,
      label: plural(completedOrders, "заказ выполнен", "заказа выполнено", "заказов выполнено"),
    },
    {
      value: activeOrders,
      label: activeOrders === 1 ? "заказ в работе" : "в работе",
    },
    {
      value: reviewCount,
      label: plural(reviewCount, "отзыв", "отзыва", "отзывов"),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
          style={{ borderRadius: "var(--r-card)" }}
        >
          <b className="block text-2xl font-black leading-tight text-blue-950">{tile.value}</b>
          <span className="text-xs font-semibold text-slate-500">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Live state of the order currently being worked on.
 *
 * `boosterOnline` is already toggled by the booster from /portal and shown on
 * the order card — surfacing it at the top of the profile is the one thing on
 * this page that changes minute to minute.
 *
 * Tinted with blue-50/blue-100 rather than indigo because those are the shades
 * the site-dark palette remaps; indigo stays light and the card became a grey
 * slab on black.
 */
export function ActiveBoostCard({ order }: { order: ProfileOrder }) {
  const title = order.items[0]?.serviceTitle ?? "Заказ";
  const extra = order.items.length - 1;
  const since = formatDate(order.createdAt, { day: "numeric", month: "long" });

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-3 border border-blue-100 bg-blue-50/60 px-5 py-4 shadow-sm"
      style={{ borderRadius: "var(--r-card)" }}
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          order.boosterOnline
            ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)] animate-pulse"
            : "bg-slate-300 shadow-[0_0_0_4px_rgba(148,163,184,0.15)]"
        }`}
      />
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-bold text-slate-900">
          {order.boosterOnline ? "Бустер на аккаунте" : "Бустер не на аккаунте"} — {title}
          {extra > 0 && ` и ещё ${extra}`}
        </p>
        <p className="text-xs text-slate-500">
          Заказ № {order.id.slice(0, 8)}
          {since && ` · в работе с ${since}`}
        </p>
      </div>
      <Link href="/orders" className="btn-outline btn-sm">
        К заказу
      </Link>
    </div>
  );
}

export function RecentOrdersCard({ orders }: { orders: ProfileOrder[] }) {
  return (
    <SectionCard
      title="Последние заказы"
      icon={<Package className="h-4 w-4 text-[#0B5191]" strokeWidth={2.2} />}
      action={
        orders.length > 0 ? (
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0B5191] transition-opacity hover:opacity-75"
          >
            Все заказы
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null
      }
    >
      {orders.length === 0 ? (
        <EmptyState
          text="Заказов пока нет. Выберите услугу — Вэлль всё сделает."
          ctaLabel="Выбрать услугу"
          ctaHref="/services"
        />
      ) : (
        <ul className="flex flex-col">
          {orders.map((order) => {
            const meta = getOrderStatusMeta(order.status);
            const StatusIcon = meta.icon;
            const title = order.items[0]?.serviceTitle ?? "Заказ";
            const extra = order.items.length - 1;
            const date = formatDate(order.createdAt, { day: "numeric", month: "short" });
            return (
              <li
                key={order.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 py-3 first:border-t-0 first:pt-0"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0B5191]">
                  <Package className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {title}
                    {extra > 0 && ` и ещё ${extra}`}
                  </p>
                  <p className="text-[11.5px] text-slate-400">
                    № {order.id.slice(0, 8)}
                    {date && ` · ${date}`}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.classes}`}
                >
                  <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
                  {meta.label}
                </span>
                <span className="text-sm font-extrabold tabular-nums text-blue-900">
                  {formatMoney(order.totalPrice)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
