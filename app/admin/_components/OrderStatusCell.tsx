"use client";

import { useState } from "react";
import { getOrderStatusMeta, orderStatusLabel } from "@/lib/orderStatus";

// Admin can only set these manually; `paid`/`refunded` are driven by the
// payment/refund webhooks (mirrors ALLOWED_STATUSES in the PATCH route and the
// detail-page StatusChanger).
const ADMIN_ALLOWED_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

/**
 * Inline order-status badge with a hover dropdown to change the status straight
 * from the orders table (same UX as the reviews table). Updates optimistically
 * and reverts on failure.
 */
export default function OrderStatusCell({
  orderId,
  status,
  onResult,
}: {
  orderId: string;
  status: string;
  onResult: (newStatus: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const meta = getOrderStatusMeta(status);
  const Icon = meta.icon;

  const change = async (newStatus: string) => {
    if (newStatus === status || saving) return;
    setSaving(true);
    onResult(newStatus); // optimistic
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Order status update failed:", e);
      onResult(status); // revert
      alert("Не удалось обновить статус");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative group inline-block">
      <button
        type="button"
        disabled={saving}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${meta.classes}`}
      >
        <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
        {meta.label}
      </button>
      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap">
        {ADMIN_ALLOWED_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              change(s);
            }}
            className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${
              s === status
                ? "font-semibold text-slate-900"
                : "text-slate-600"
            }`}
          >
            {orderStatusLabel(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
