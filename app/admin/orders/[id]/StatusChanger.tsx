"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { orderStatusLabel } from "../../_components/OrderStatusBadge";

// Admin can only change these statuses manually
// 'paid' and 'refunded' are set automatically by payment/refund webhooks
const ADMIN_ALLOWED_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export default function StatusChanger({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = status !== initialStatus;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const isBusy = saving || pending;

  // Show warning if current status is 'paid' or 'refunded'
  const isReadOnlyStatus = initialStatus === "paid" || initialStatus === "refunded";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Текущий:</span>
        <span className="text-sm font-medium">{orderStatusLabel(initialStatus)}</span>
      </div>

      {isReadOnlyStatus && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-200">
          <strong>Внимание:</strong> Статус "{orderStatusLabel(initialStatus)}" устанавливается автоматически системой оплаты и не может быть изменён вручную.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {ADMIN_ALLOWED_STATUSES.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={[
                "px-3 py-2 rounded-full text-sm font-medium text-left transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              {orderStatusLabel(s)}
            </button>
          );
        })}
      </div>

      <button
        onClick={save}
        disabled={!dirty || isBusy}
        className={[
          "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors",
          dirty && !isBusy
            ? "btn-primary !px-4"
            : "bg-slate-100 text-slate-400 cursor-not-allowed",
        ].join(" ")}
      >
        {isBusy ? "Сохраняю…" : savedAt && !dirty ? (
          <>
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Сохранено
          </>
        ) : (
          "Сохранить изменения"
        )}
      </button>

      {error && (
        <div className="text-xs text-rose-600 bg-rose-50 rounded-xl p-3">
          {error}
        </div>
      )}
    </div>
  );
}
