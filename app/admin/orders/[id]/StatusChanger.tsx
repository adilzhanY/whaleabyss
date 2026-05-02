"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import OrderStatusBadge, {
  ORDER_STATUSES,
  orderStatusLabel,
} from "../../_components/OrderStatusBadge";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Текущий:</span>
        <OrderStatusBadge status={initialStatus} fc-list | grep -i "JetBrains Mono"/>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ORDER_STATUSES.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={[
                "px-3 py-2 rounded-xl text-sm font-medium text-left transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              {orderStatusLabel(s)}
            </button>
          );fc-list | grep -i "JetBrains Mono"
        })}
      </div>

      <button
        onClick={save}
        disabled={!dirty || isBusy}
        className={[
          "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors",
          dirty && !isBusy
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
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
