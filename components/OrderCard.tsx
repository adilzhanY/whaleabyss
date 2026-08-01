"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getOrderStatusMeta, type OrderStatus } from "@/lib/orderStatus";
import { resolveDisplayStatus } from "@/lib/justPaidOrders";
import TelegramIcon from "@/components/TelegramIcon";

interface OrderItem {
  serviceId?: string;
  serviceTitle?: string;
  serviceImage?: string;
  serviceName?: string;
  quantity?: number;
  [key: string]: unknown;
}

interface OrderCardProps {
  order: {
    id: string;
    status: string;
    createdAt: string;
    /** Last status change — what «в работе 3 дня» is measured from. */
    updatedAt?: string;
    totalPrice?: number | string;
    totalAmount?: number | string;
    /** Booster is currently on the customer's account (toggled from /portal). */
    boosterOnline?: boolean;
    items?: OrderItem[];
    [key: string]: unknown;
  };
  isGrayscale?: boolean;
}

/** Support account — «спросить о заказе» opens a chat with the order number. */
const SUPPORT_TELEGRAM = "https://t.me/whaleabyss";

/** Statuses the customer is actively waiting on. */
const ACTIVE_STATUSES = new Set(["pending", "paid", "in_progress"]);

/**
 * Left rail colour per status. The rail is the fastest read on the page: you
 * see which order is moving without reading a single word.
 */
const RAIL: Record<string, string> = {
  pending: "bg-slate-300",
  paid: "bg-gradient-to-b from-emerald-400 to-emerald-500",
  in_progress: "bg-gradient-to-b from-sky-400 to-sky-500",
  completed: "bg-slate-300",
  cancelled: "bg-rose-300",
  refunded: "bg-amber-300",
};

const MS_DAY = 86_400_000;

function daysBetween(from: string | undefined, to = Date.now()) {
  if (!from) return null;
  const ms = to - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / MS_DAY);
}

/** «3 дня» / «1 день» / «12 дней». */
function plural(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} дня`;
  return `${n} дней`;
}

/** «1 услуга» / «3 услуги» / «10 услуг». */
function pluralServices(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} услуга`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} услуги`;
  return `${n} услуг`;
}

function shortDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

/**
 * The one line that answers «где мой заказ» without inventing a progress bar:
 * how long it has been in its current state, plus the date it was placed.
 */
function timingLine(order: OrderCardProps["order"], displayStatus: string) {
  const placed = shortDate(order.createdAt);
  const inStatus = daysBetween(order.updatedAt ?? order.createdAt);

  if (displayStatus === "in_progress") {
    return inStatus != null && inStatus > 0
      ? `В работе ${plural(inStatus)} · заказ от ${placed}`
      : `Взят в работу сегодня · заказ от ${placed}`;
  }
  if (displayStatus === "paid") {
    // Optimistic state: the success redirect happened but the webhook hasn't
    // confirmed yet — don't assert «ждёт качера» before the money is verified.
    if (order.status === "pending") return `Оплачен · подтверждаем оплату`;
    return inStatus != null && inStatus > 0
      ? `Оплачен ${plural(inStatus)} назад · ждёт качера`
      : `Оплачен сегодня · ждёт качера`;
  }
  if (displayStatus === "completed") {
    // Optimistic state: the completion modal was just shown but this card's
    // data predates the status flip — the stale updatedAt would date the
    // completion wrongly, so say the honest thing instead.
    if (order.status !== "completed") return "Выполнен только что";
    const took = order.updatedAt ? daysBetween(order.createdAt, new Date(order.updatedAt).getTime()) : null;
    const done = shortDate(order.updatedAt) || placed;
    return took != null && took > 0 ? `Выполнен ${done} · занял ${plural(took)}` : `Выполнен ${done}`;
  }
  return `Заказ от ${placed}`;
}

/** One service as a compact pill — see the note on the items row below. */
function ItemPill({ item }: { item: OrderItem }) {
  const name = item.serviceName || item.serviceTitle || "Услуга";
  const image = typeof item.serviceImage === "string" && item.serviceImage.startsWith("http")
    ? item.serviceImage
    : null;
  const qty = Number(item.quantity ?? 1);

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        // Half the services have no image; a letter reads as a service, a grey
        // dot reads as a broken picture.
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold uppercase text-slate-500">
          {name.charAt(0)}
        </span>
      )}
      <span className="truncate text-[13px] font-medium text-slate-700">{name}</span>
      {qty > 1 && <span className="shrink-0 text-[12px] font-semibold text-slate-400">×{qty}</span>}
    </span>
  );
}

/**
 * Soft dotted connector between two steps.
 *
 * A repeating radial-gradient rather than a border: `border-dotted` renders
 * square-ish dashes whose size is tied to the border width, while this draws
 * real circles at a fixed pitch — the same soft look at any width.
 */
function DottedLink({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      // Negative margins pull the line under the step columns, towards the
      // dots: the 20px dot sits centred in a 74px label column, so without them
      // the connector stops ~27px short of the dot on each side. −16px leaves
      // an ~11px breath — close, but visibly not touching (−24px read as the
      // line running straight through the dots).
      className="mt-2 h-2 min-w-[18px] flex-1 -mx-4"
      style={{
        backgroundImage: `radial-gradient(circle, ${done ? "#6ee7b7" : "#cbd5e1"} 40%, transparent 44%)`,
        backgroundSize: "9px 9px",
        backgroundRepeat: "repeat-x",
        backgroundPosition: "center",
      }}
    />
  );
}

/** Three honest steps built from statuses we actually store — no percentages. */
function Timeline({ status, createdAt, updatedAt }: { status: string; createdAt: string; updatedAt?: string }) {
  const reached = status === "in_progress" ? 1 : status === "completed" ? 2 : 0;
  const steps = [
    { label: "Оплачен", date: shortDate(createdAt) },
    { label: "В работе", date: status === "in_progress" ? shortDate(updatedAt) : "" },
    { label: "Выполнен", date: status === "completed" ? shortDate(updatedAt) : "" },
  ];

  return (
    // The step columns are fixed-width and the connectors take what is left.
    // They used to be `flex-1` next to a `w-full` label column, which left them
    // exactly zero pixels — the line was there but invisible.
    <div className="flex items-start justify-between">
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          <div className="flex w-[74px] shrink-0 flex-col items-center gap-1.5">
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                i < reached
                  ? "bg-emerald-100 text-emerald-700"
                  : i === reached
                    ? "bg-[#1e3a8a] text-white ring-4 ring-[#1e3a8a]/12"
                    : "bg-slate-200 text-slate-400",
              ].join(" ")}
            >
              {i < reached ? "✓" : "•"}
            </span>
            <span
              className={`text-center text-[11px] leading-tight ${
                i === reached ? "font-semibold text-[#1e3a8a]" : "text-slate-500"
              }`}
            >
              {step.label}
              {step.date && <span className="block text-[10.5px] text-slate-400">{step.date}</span>}
            </span>
          </div>
          {i < steps.length - 1 && <DottedLink done={i < reached} />}
        </Fragment>
      ))}
    </div>
  );
}

/**
 * Customer-facing order card, shared by `/orders` and the homepage.
 *
 * Design notes, all driven by what the data actually looks like:
 *  - **No progress bar, no booster name** — we store neither. The honest
 *    substitute is TIME: «в работе 3 дня», and the live «бустер на аккаунте»
 *    chip when `boosterOnline` is set. The negative variant of that chip is
 *    gone: «не на аккаунте» is the normal state and used to shout like an error.
 *  - **Items are wrapping pills, not stacked rows with 56px thumbnails.** Half
 *    the orders hold a single service and half the services have no image, so
 *    tall image rows made a one-line order look broken and a five-line order
 *    twice as tall. Pills show every position and wrap, so 1 and 5 items differ
 *    by a line or two instead of by a screenful.
 *  - **The order number moved to the footer** — it matters once, when writing
 *    to support, and that is exactly where the support link sits.
 */
export default function OrderCard({ order, isGrayscale = false }: OrderCardProps) {
  // What the customer sees: the real status, except a pending order whose
  // payment-success redirect this browser just witnessed renders as «Оплачен»
  // until the webhook confirms (see lib/justPaidOrders.ts).
  const displayStatus = resolveDisplayStatus(order);
  const meta = getOrderStatusMeta(displayStatus);
  const StatusIcon = meta.icon;
  const isActive = ACTIVE_STATUSES.has(displayStatus);
  const total = Number(order.totalPrice ?? order.totalAmount ?? 0);
  const items = order.items ?? [];
  const [expanded, setExpanded] = useState(false);
  // Three is what fits on one line on a phone, so the collapsed card is the
  // same height whether the order has four services or forty.
  const visibleItems = items.slice(0, 3);
  const hiddenItems = items.slice(3);

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${
        isGrayscale ? "opacity-90 hover:opacity-100" : ""
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[5px] ${RAIL[displayStatus] ?? "bg-slate-300"}`}
      />

      <div className="flex flex-1 flex-col p-5 pl-7">
        {/* status + money */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.classes}`}
              >
                <StatusIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                {meta.label}
              </span>
              {displayStatus === "in_progress" && order.boosterOnline && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  title="Качер сейчас выполняет заказ на вашем аккаунте"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Качер на аккаунте
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] text-slate-500">{timingLine(order, displayStatus)}</p>
          </div>

          <div className="text-right">
            <div className="text-lg font-extrabold tabular-nums text-slate-900">
              {total.toLocaleString("ru-RU")} ₽
            </div>
            {items.length > 1 && (
              <div className="text-[12px] text-slate-400">{pluralServices(items.length)}</div>
            )}
          </div>
        </div>

        {/* the honest «where is my order» track, only while it is moving */}
        {isActive && displayStatus !== "pending" && (
          <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
            <Timeline status={displayStatus} createdAt={order.createdAt} updatedAt={order.updatedAt} />
          </div>
        )}

        {/* The positions. A ten-service order used to print ten pills and push
            the order number, the status track and the «спросить» button far
            below the fold, so a card with one service and a card with ten no
            longer looked like the same object. Three lead, the rest are one tap
            away.

            The reveal animates via grid-template-rows 0fr → 1fr: the row's
            height is derived from the content, so nothing has to be measured
            and no max-height has to be guessed (a guess too small clips the
            last row, too large makes the easing look wrong). */}
        {items.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {visibleItems.map((item, idx) => (
                <ItemPill key={idx} item={item} />
              ))}
              {hiddenItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="btn-outline btn-sm !h-8 !rounded-full !px-3 text-xs"
                >
                  {expanded ? "Свернуть" : `Ещё ${hiddenItems.length}`}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                    strokeWidth={2.5}
                  />
                </button>
              )}
            </div>
            {hiddenItems.length > 0 && (
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
                style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-wrap gap-2 pt-2">
                    {hiddenItems.map((item, idx) => (
                      <ItemPill key={idx} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <span className="font-mono text-[11px] text-slate-400">
            № {order.id.slice(0, 8).toUpperCase()}
          </span>
          {isActive && (
            <a
              href={`${SUPPORT_TELEGRAM}?text=${encodeURIComponent(
                `Здравствуйте! Вопрос по заказу № ${order.id.slice(0, 8).toUpperCase()}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline btn-sm text-xs"
            >
              <TelegramIcon className="h-3.5 w-3.5" />
              Спросить о заказе
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export type { OrderStatus };
