"use client";

import { useRef } from "react";
import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  /** Spinner on the confirm button; also blocks dismissal. */
  pending?: boolean;
  /** Shown inline so a failed action can be retried instead of vanishing. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable confirmation dialog.
 *
 * Controlled on purpose so it can be dropped into any component, but most
 * call sites should use the imperative `confirmDialog()` helper backed by the
 * single instance mounted in `ConfirmDialogHost`.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  variant = "primary",
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isDanger = variant === "danger";
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  // Escape / outside-click must not dismiss a dialog whose action is running.
  const blockWhilePending = (event: Event) => {
    if (pending) event.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!pending}
        onEscapeKeyDown={blockWhilePending}
        onPointerDownOutside={blockWhilePending}
        onInteractOutside={blockWhilePending}
        // Focus the safe choice first — a destructive confirm should never be
        // one stray Enter away.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: isDanger
                  ? "rgba(239,68,68,0.12)"
                  : "color-mix(in srgb, var(--accent-primary) 10%, transparent)",
                color: isDanger ? "#dc2626" : "var(--accent-primary)",
              }}
            >
              <Icon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <DialogTitle>{title}</DialogTitle>
              {description ? (
                <DialogDescription>{description}</DialogDescription>
              ) : (
                // Radix warns without a description; keep it for screen readers.
                <DialogDescription className="sr-only">
                  Подтвердите действие
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

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
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="btn-outline w-full sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
            className={`${isDanger ? "btn-danger" : "btn-primary"} w-full sm:w-auto`}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel ?? (isDanger ? "Удалить" : "Подтвердить")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
