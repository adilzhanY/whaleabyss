"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import CustomInput from "@/components/CustomInput";

interface AddPaymentModalProps {
  onClose: () => void;
  /** Called after the payment is stored, so the page can refetch its totals. */
  onAdded: () => void;
}

export default function AddPaymentModal({ onClose, onAdded }: AddPaymentModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Введите сумму больше нуля");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch("/api/admin/debt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, paidAt, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить платёж");
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить платёж");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2
              className="text-xl font-black text-blue-950"
              style={{ fontFamily: "var(--font-primary), sans-serif" }}
            >
              Добавить платёж
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Сумма в USDT и дата перевода</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Сумма, USDT
            </label>
            <CustomInput
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              autoFocus
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Дата платежа
            </label>
            <CustomInput
              type="date"
              value={paidAt}
              max={today}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Комментарий (необязательно)
            </label>
            <CustomInput
              type="text"
              maxLength={200}
              placeholder="Например: перевод на USDT TRC-20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-4">
          {error ? (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          ) : (
            <span className="text-sm text-slate-400">Платёж уменьшит остаток долга</span>
          )}
          <div className="flex gap-3 shrink-0">
            <button onClick={onClose} className="btn-outline !py-2.5 !px-5">
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary !py-2.5 !px-6 disabled:opacity-50"
            >
              {submitting ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
