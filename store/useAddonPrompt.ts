import { create } from "zustand";
import { CartItem } from "./useCart";

// A quest service offered as an addon to an exploration service
// (shape matches /api/services/[slug]/addons response items).
export interface AddonService {
  id: string; // slug
  title: string;
  subtitle: string;
  price: number;
  image?: string;
}

interface AddonPromptState {
  isOpen: boolean;
  /** The exploration service the user is adding to the cart. */
  parent: Omit<CartItem, "quantity"> | null;
  parentQuantity: number;
  addons: AddonService[];
  open: (
    parent: Omit<CartItem, "quantity">,
    addons: AddonService[],
    quantity?: number
  ) => void;
  close: () => void;
}

/**
 * Global state for the quest-addon upsell modal (QuestAddonModal).
 * Opened instead of a direct addToCart when the service has linked
 * quest addons; the modal then performs the actual cart mutations.
 */
export const useAddonPrompt = create<AddonPromptState>((set) => ({
  isOpen: false,
  parent: null,
  parentQuantity: 1,
  addons: [],
  open: (parent, addons, quantity = 1) =>
    set({ isOpen: true, parent, addons, parentQuantity: quantity }),
  close: () => set({ isOpen: false }),
}));
