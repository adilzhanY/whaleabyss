"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteOrderButtonProps {
  orderId: string;
  orderStatus: string;
}

export default function DeleteOrderButton({
  orderId,
  orderStatus,
}: DeleteOrderButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  // Only abandoned/unfinished/refunded orders may be deleted. Active paid orders
  // (incl. manually-paid) keep their financial record — mirrors the API guard.
  if (
    orderStatus !== "cancelled" &&
    orderStatus !== "pending" &&
    orderStatus !== "refunded"
  ) {
    return null;
  }

  // Require the admin to type the short order id — a deliberate friction step
  // so a paid/manual order is never deleted by an accidental click. This is
  // why it does NOT use the shared confirmDialog(): a plain yes/no would drop
  // that safeguard.
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
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Произошла ошибка");
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

      <Dialog
        open={showConfirm}
        onOpenChange={(open) => {
          // A delete request in flight must not be dismissed underneath.
          if (!open && !isDeleting) close();
        }}
      >
        <DialogContent
          showCloseButton={!isDeleting}
          onEscapeKeyDown={(e) => {
            if (isDeleting) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (isDeleting) e.preventDefault();
          }}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"
              >
                <AlertTriangle className="size-5" strokeWidth={2.25} />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle>Удалить заказ навсегда</DialogTitle>
                <DialogDescription>Это действие необратимо.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Заказ и все его позиции будут{" "}
            <span className="font-semibold text-rose-700">удалены безвозвратно</span>.
            Восстановить их или отменить это действие будет невозможно. Удаляйте заказ
            только если уверены — для оплаченных заказов это сотрёт запись об оплате.
          </p>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="delete-order-confirm"
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Чтобы подтвердить, введите{" "}
              <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {confirmKey}
              </span>
            </label>
            <input
              id="delete-order-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              disabled={isDeleting}
              placeholder={confirmKey}
              className="input-field font-mono !text-sm disabled:opacity-50"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl px-3.5 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.30)",
                color: "#b91c1c",
              }}
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <button
              onClick={close}
              disabled={isDeleting}
              className="btn-outline w-full sm:w-auto"
            >
              Отмена
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || !canDelete}
              aria-busy={isDeleting}
              className="btn-danger w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" strokeWidth={2.25} />
                  Удалить навсегда
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
