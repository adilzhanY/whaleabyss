import {
  getOrderStatusMeta,
  ORDER_STATUSES,
  orderStatusLabel,
  type OrderStatus,
} from "@/lib/orderStatus";

export default function OrderStatusBadge({ status }: { status: string }) {
  const meta = getOrderStatusMeta(status);
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.classes}`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

export { ORDER_STATUSES, orderStatusLabel };
export type { OrderStatus };
