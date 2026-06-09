"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Column } from "./DataTable";
import OrderStatusCell from "./OrderStatusCell";
import OrderBoosterCell from "./OrderBoosterCell";
import OrderOnlineToggle from "./OrderOnlineToggle";
import CopyableTelegram from "./CopyableTelegram";
import OrderItemsCell, { type OrderItemSummary } from "./OrderItemsCell";

/** Shared row shape for the Orders page and the Dashboard "recent orders" table. */
export interface OrderRow {
  id: string;
  userId: string | null;
  status: string | null;
  totalPrice: string;
  createdAt: string;
  paymentId: string | null;
  paymentMethod: string | null;
  isTestPayment: boolean | null;
  username: string | null;
  email: string | null;
  telegramUsername: string | null;
  boosterId: string | null;
  boosterFirstName: string | null;
  boosterOnline: boolean;
  items: OrderItemSummary[];
}

/** Human label for the acquiring channel recorded on the order. */
function paymentMethodLabel(method: string | null): string | null {
  if (method === "sbp") return "СБП";
  if (method === "card") return "Карта РФ";
  return null;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface BuildOrderColumnsOptions {
  /** Apply a row-level patch to the parent's order list (status / booster updates). */
  onOrderChange: (id: string, patch: Partial<OrderRow>) => void;
  /** Show the running № column (Orders page) — omit on the Dashboard. */
  showIndex?: boolean;
}

/**
 * Builds the column set shared by the Orders page and the Dashboard recent-orders
 * table, so both render identically through {@link DataTable}.
 */
export function buildOrderColumns({
  onOrderChange,
  showIndex = false,
}: BuildOrderColumnsOptions): Column<OrderRow>[] {
  const columns: Column<OrderRow>[] = [];

  if (showIndex) {
    columns.push({
      key: "index",
      header: "№",
      width: "w-8",
      hideOnMobile: true,
      render: (_row, index) => (
        <span className="text-slate-600">{index + 1}</span>
      ),
    });
  }

  columns.push(
    {
      key: "id",
      header: "ID заказа",
      mobileLabel: "ID заказа",
      render: (o) => (
        <div className="font-mono text-xs text-slate-500">
          <Link href={`/admin/orders/${o.id}`} className="hover:text-indigo-600">
            {o.id.slice(0, 8)}...
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1 md:justify-start justify-end">
            {o.isTestPayment && (
              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide font-sans">
                Тест
              </span>
            )}
            {paymentMethodLabel(o.paymentMethod) && (
              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold font-sans">
                {paymentMethodLabel(o.paymentMethod)}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Позиции",
      mobileLabel: "Позиции",
      width: "w-44",
      mobileFullWidth: true,
      render: (o) => <OrderItemsCell items={o.items} />,
    },
    {
      key: "customer",
      header: "Клиент",
      mobileLabel: "Клиент",
      width: "w-44",
      render: (o) => (
        <div className="md:text-left text-right">
          <div className="font-medium flex items-center gap-1.5 md:justify-start justify-end">
            <span className="truncate">{o.username ?? "— guest —"}</span>
            {o.userId && (
              <Link
                href={`/admin/users/${o.userId}`}
                title="Открыть профиль клиента"
                onClick={(e) => e.stopPropagation()}
                className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <div className="md:flex md:justify-start flex justify-end">
            <CopyableTelegram username={o.telegramUsername} />
          </div>
        </div>
      ),
    },
    {
      key: "booster",
      header: "Бустер",
      mobileLabel: "Бустер",
      render: (o) => (
        <div className="md:block flex justify-end">
          <OrderBoosterCell
            orderId={o.id}
            status={o.status ?? "pending"}
            boosterId={o.boosterId}
            boosterFirstName={o.boosterFirstName}
            onResult={(boosterId, boosterFirstName, newStatus) =>
              onOrderChange(o.id, {
                boosterId,
                boosterFirstName,
                ...(newStatus ? { status: newStatus } : {}),
              })
            }
          />
        </div>
      ),
    },
    {
      key: "online",
      header: "На акке",
      mobileLabel: "На аккаунте",
      render: (o) => (
        <div className="md:block flex justify-end">
          <OrderOnlineToggle
            orderId={o.id}
            status={o.status ?? "pending"}
            boosterId={o.boosterId}
            online={o.boosterOnline}
            onResult={(online) => onOrderChange(o.id, { boosterOnline: online })}
          />
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      mobileLabel: "Статус",
      width: "w-20",
      render: (o) => (
        <OrderStatusCell
          orderId={o.id}
          status={o.status ?? "pending"}
          onResult={(newStatus) => onOrderChange(o.id, { status: newStatus })}
        />
      ),
    },
    {
      key: "total",
      header: "Сумма",
      mobileLabel: "Сумма",
      align: "right",
      render: (o) => (
        <span className="font-medium whitespace-nowrap">
          {Number(o.totalPrice).toLocaleString("ru-RU")} ₽
        </span>
      ),
    },
    {
      key: "date",
      header: "Дата",
      mobileLabel: "Дата",
      align: "right",
      render: (o) => (
        <span className="text-slate-500 whitespace-nowrap">
          {formatDateTime(o.createdAt)}
        </span>
      ),
    }
  );

  return columns;
}
