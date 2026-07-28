"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DataSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Informational modal on the cart page. Uses the shared dialog primitives —
 * the hand-rolled overlay, mount/unmount timers and transition classes it
 * used to carry are all handled by the primitive now.
 */
export default function DataSecurityModal({ isOpen, onClose }: DataSecurityModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle
            className="!text-2xl !font-black"
            style={{ color: "var(--accent-primary)" }}
          >
            Безопасность данных
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-3 leading-relaxed">
              <p>
                Сразу после успешного выполнения услуги наш <b>специалист</b> полностью
                удалит активную сессию с вашего аккаунта и очистит все данные для входа.
              </p>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Ваш аккаунт в полной безопасности: он не будет забанен, удален или украден.
                Мы гарантируем 100% конфиденциальность.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <button onClick={onClose} className="btn-primary w-full !py-3.5 !font-bold">
          Понятно, спасибо
        </button>
      </DialogContent>
    </Dialog>
  );
}
