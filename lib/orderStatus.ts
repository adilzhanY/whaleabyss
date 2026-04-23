import { Clock, CircleCheck, Truck, PackageCheck, XCircle, RotateCcw } from "lucide-react";

export type OrderStatus =
  | "pending"
  | "paid"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "refunded";

export interface OrderStatusMeta {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Tailwind classes — applied both to admin badge and customer-facing pill. */
  classes: string;
}

/**
 * Single source of truth for order-status presentation (icon, label, colors).
 * Consumed by both the admin panel (`app/admin/_components/OrderStatusBadge`)
 * and the customer-facing `OrderCard`.
 */
export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusMeta> = {
  pending:     { label: "Ожидает оплаты", icon: Clock,        classes: "bg-slate-100 text-slate-700" },
  paid:        { label: "Оплачен",        icon: CircleCheck,  classes: "bg-emerald-50 text-emerald-700" },
  in_progress: { label: "В работе",       icon: Truck,        classes: "bg-indigo-50 text-indigo-700" },
  completed:   { label: "Выполнен",       icon: PackageCheck, classes: "bg-blue-50 text-blue-700" },
  cancelled:   { label: "Отменён",        icon: XCircle,      classes: "bg-rose-50 text-rose-700" },
  refunded:    { label: "Возвращён",      icon: RotateCcw,    classes: "bg-amber-50 text-amber-700" },
};

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "in_progress",
  "completed",
  "cancelled",
  "refunded",
];

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  return ORDER_STATUS_CONFIG[status as OrderStatus] ?? ORDER_STATUS_CONFIG.pending;
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_CONFIG[status as OrderStatus]?.label ?? status;
}
