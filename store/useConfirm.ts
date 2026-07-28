import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Defaults to «Подтвердить» (primary) / «Удалить» is a common override. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` paints the confirm button red and the icon amber/red. */
  variant?: "danger" | "primary";
  /**
   * Optional work to run WHILE the dialog stays open, with a spinner on the
   * confirm button. If it rejects, the dialog stays open and shows the error
   * so the user can retry — a failed delete must never look like a success.
   * Omit it to get a plain yes/no and do the work yourself after awaiting.
   */
  action?: () => void | Promise<void>;
}

interface ConfirmState {
  open: boolean;
  /** Kept after close so the exit animation doesn't flash an empty dialog. */
  options: ConfirmOptions | null;
  pending: boolean;
  error: string | null;
  resolver: ((ok: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  accept: () => Promise<void>;
  cancel: () => void;
  /** Bridge for Radix `onOpenChange`; refuses to close mid-action. */
  setOpen: (open: boolean) => void;
}

const FALLBACK_ERROR = "Не удалось выполнить действие. Попробуйте ещё раз.";

/**
 * One global confirmation dialog, mounted once by `ConfirmDialogHost` in
 * `app/Providers.tsx`. Any call site — component, event handler, or plain
 * async function — can await it, which is what makes it a drop-in replacement
 * for `window.confirm()`:
 *
 *   if (!(await confirmDialog({ title: "Удалить?", variant: "danger" }))) return;
 */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  pending: false,
  error: null,
  resolver: null,

  confirm: (options) => {
    // A second confirm while one is open would strand the first promise
    // forever; resolve it as "cancelled" before taking over the dialog.
    const previous = get().resolver;
    if (previous) previous(false);
    return new Promise<boolean>((resolve) => {
      set({
        open: true,
        options,
        pending: false,
        error: null,
        resolver: resolve,
      });
    });
  },

  accept: async () => {
    const { options, resolver, pending } = get();
    if (pending) return;

    const action = options?.action;
    if (!action) {
      set({ open: false, pending: false, error: null, resolver: null });
      resolver?.(true);
      return;
    }

    set({ pending: true, error: null });
    try {
      await action();
      set({ open: false, pending: false, error: null, resolver: null });
      resolver?.(true);
    } catch (err) {
      set({
        pending: false,
        error: err instanceof Error && err.message ? err.message : FALLBACK_ERROR,
      });
    }
  },

  cancel: () => {
    const { resolver, pending } = get();
    // Dismissing mid-action would resolve `false` while the work is still in
    // flight, so the caller would think nothing happened.
    if (pending) return;
    set({ open: false, pending: false, error: null, resolver: null });
    resolver?.(false);
  },

  setOpen: (open) => {
    if (open) return;
    get().cancel();
  },
}));

/** Hook-free entry point — usable anywhere, including non-React callbacks. */
export const confirmDialog = (options: ConfirmOptions): Promise<boolean> =>
  useConfirmStore.getState().confirm(options);
