"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Admin-side «на аккаунте» toggle — same pill as the booster's portal toggle.
 * Lets the admin flip orders.boosterOnline (e.g. if a booster forgot to turn
 * it off). Only rendered for in-progress orders with an assigned booster;
 * otherwise shows "—". Optimistic update with revert on failure.
 */
export default function OrderOnlineToggle({
  orderId,
  status,
  boosterId,
  online,
  onResult,
}: {
  orderId: string;
  status: string;
  boosterId: string | null;
  online: boolean;
  onResult?: (online: boolean) => void;
}) {
  // Internal state so the toggle also works standalone (detail page, where
  // there is no parent row list to patch). Kept in sync with the prop.
  const [value, setValue] = useState(online);
  const [busy, setBusy] = useState(false);

  useEffect(() => setValue(online), [online]);

  if (status !== "in_progress" || !boosterId) {
    return <span className="text-slate-300">—</span>;
  }

  const toggle = async () => {
    if (busy) return;
    const next = !value;
    setBusy(true);
    setValue(next); // optimistic
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boosterOnline: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onResult?.(next);
    } catch (e) {
      console.error("boosterOnline update failed:", e);
      setValue(!next); // revert
      alert("Не удалось изменить статус «на аккаунте»");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title="Видно клиенту в его заказе"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap ${
        value
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {busy ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <span className={`w-2 h-2 rounded-full ${value ? "bg-emerald-500" : "bg-slate-300"}`} />
      )}
      {value ? "На аккаунте" : "Не на аккаунте"}
    </button>
  );
}
