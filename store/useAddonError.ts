import { create } from "zustand";

interface AddonErrorState {
  isOpen: boolean;
  /** Subtitle of the service we couldn't load the quest list for. */
  serviceName: string | null;
  /** Re-runs the add that failed, so «Попробовать снова» is one tap. */
  retry: (() => void) | null;
  open: (serviceName: string, retry?: () => void) => void;
  close: () => void;
}

/**
 * Global state for AddonUnavailableModal.
 *
 * Shown when a service is known to be quest-gated but its quest list can't be
 * fetched. Adding it is refused rather than degraded: a line added without the
 * declaration is an order the booster can't fulfil, and /api/checkout would
 * reject it at the payment step anyway. Better to fail here, visibly, where
 * retrying costs one tap.
 */
export const useAddonError = create<AddonErrorState>((set) => ({
  isOpen: false,
  serviceName: null,
  retry: null,
  open: (serviceName, retry) =>
    set({ isOpen: true, serviceName, retry: retry ?? null }),
  close: () => set({ isOpen: false, retry: null }),
}));
