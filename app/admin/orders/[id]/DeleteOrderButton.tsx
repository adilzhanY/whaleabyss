"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteOrderButtonProps {
  orderId: string;
}

export default function DeleteOrderButton({ orderId }: DeleteOrderButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  // Require the admin to type the short order id — a deliberate friction step
  // so a paid/manual order is never deleted by an accidental click.
  const confirmKey = orderId.slice(0, 8);
  const canDelete = confirmText.trim() === confirmKey;

  const close = () => {
    setShowConfirm(false);
    setError(null);
    setConfirmText("");
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Ошибка при удалении заказа");
      }

      // Order is gone — leave the (now-404) detail page for the orders list.
      router.replace("/admin/orders");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full font-medium transition-colors"
      >
        <Trash2 className="w-4 h-4" strokeWidth={2.25} />
        Удалить заказ
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Удалить заказ навсегда</h3>
                <p className="text-sm text-slate-500">Это действие необратимо.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Заказ и все его позиции будут{" "}
              <span className="font-semibold text-rose-700">удалены безвозвратно</span>.
              Восстановить их или отменить это действие будет невозможно. Удаляйте
              заказ только если уверены — для оплаченных заказов это сотрёт запись об
              оплате.
            </p>

            <label className="block text-sm text-slate-600 mb-2">
              Чтобы подтвердить, введите{" "}
              <span className="font-mono font-semibold text-slate-900">
                {confirmKey}
              </span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              disabled={isDeleting}
              placeholder={confirmKey}
              className="w-full px-4 py-2.5 mb-4 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50"
            />

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={close}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || !canDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Удаление...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" strokeWidth={2.25} />
                    Удалить навсегда
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
