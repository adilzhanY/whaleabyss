"use client";

import { useEffect } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useConfirmStore } from "@/store/useConfirm";

/**
 * The single confirmation dialog for the whole site, mounted once in
 * `app/Providers.tsx`. Call `confirmDialog()` from anywhere to drive it.
 */
export default function ConfirmDialogHost() {
  const open = useConfirmStore((s) => s.open);
  const options = useConfirmStore((s) => s.options);
  const pending = useConfirmStore((s) => s.pending);
  const error = useConfirmStore((s) => s.error);
  const accept = useConfirmStore((s) => s.accept);
  const cancel = useConfirmStore((s) => s.cancel);
  const setOpen = useConfirmStore((s) => s.setOpen);

  // Radix and vaul both park `pointer-events: none` on <body> while a modal
  // layer is up and clear it on unmount. Stacking a dialog over the cart
  // drawer means two layers race to restore it, and losing that race leaves
  // the whole page unclickable. Once nothing is open, make sure it's gone.
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      const stillOpen = document.querySelector(
        "[data-slot=dialog-content],[data-vaul-drawer]"
      );
      if (!stillOpen && document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [open]);

  if (!options) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      variant={options.variant}
      pending={pending}
      error={error}
      onConfirm={accept}
      onCancel={cancel}
    />
  );
}
