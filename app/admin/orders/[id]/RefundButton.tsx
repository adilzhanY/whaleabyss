"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

interface RefundButtonProps {
  orderId: string;
  orderStatus: string;
}

export default function RefundButton({ orderId, orderStatus }: RefundButtonProps) {
  const router = useRouter();
  const [isRefunding, setIsRefunding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefund = async () => {
    setIsRefunding(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка при возврате средств");
      }

      // Success - refresh the page to show updated status
      router.refresh();
      setShowConfirm(false);
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
      setIsRefunding(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-full font-medium transition-colors"
      >
        <RotateCcw className="w-4 h-4" strokeWidth={2.25} />
        Вернуть средства
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Подтверждение возврата</h3>
            <p className="text-sm text-slate-600 mb-6">
              Вы уверены, что хотите вернуть средства за этот заказ? Это действие нельзя отменить.
              Деньги будут возвращены клиенту через Freekassa.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setError(null);
                }}
                disabled={isRefunding}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleRefund}
                disabled={isRefunding}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRefunding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Возврат...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" strokeWidth={2.25} />
                    Подтвердить
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
