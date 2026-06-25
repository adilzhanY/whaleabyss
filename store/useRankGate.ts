import { create } from "zustand";

interface RankGateState {
  isOpen: boolean;
  /** Minimum Adventure Rank the blocked service requires. */
  requiredRank: number;
  /** The user's current Adventure Rank, or null when they haven't set one. */
  currentRank: number | null;
  open: (data: { requiredRank: number; currentRank: number | null }) => void;
  close: () => void;
}

/**
 * Global state for the Adventure Rank gate modal (RankGateModal). Opened
 * instead of adding to the cart when a logged-in user's Adventure Rank is below
 * the service's requirement (parsed from the description via
 * `parseMinAdventureRank`). The modal points the user at their profile to fix
 * the rank.
 */
export const useRankGate = create<RankGateState>((set) => ({
  isOpen: false,
  requiredRank: 0,
  currentRank: null,
  open: ({ requiredRank, currentRank }) =>
    set({ isOpen: true, requiredRank, currentRank }),
  close: () => set({ isOpen: false }),
}));
