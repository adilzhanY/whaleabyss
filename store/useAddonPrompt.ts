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

/**
 * 'add'     — the service is not in the cart yet; the modal performs the add.
 * 'declare' — the service is ALREADY in the cart and only needs a declaration
 *             (the re-prompt /cart opens when checkout rejects an undeclared
 *             quest-gated line). Quantity must not change in this mode.
 */
export type AddonPromptMode = "add" | "declare";

interface AddonPromptState {
  isOpen: boolean;
  /** The exploration service the user is adding to / has in the cart. */
  parent: Omit<CartItem, "quantity"> | null;
  parentQuantity: number;
  addons: AddonService[];
  mode: AddonPromptMode;
  open: (
    parent: Omit<CartItem, "quantity">,
    addons: AddonService[],
    quantity?: number,
    mode?: AddonPromptMode
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
  mode: "add",
  open: (parent, addons, quantity = 1, mode = "add") =>
    set({ isOpen: true, parent, addons, parentQuantity: quantity, mode }),
  close: () => set({ isOpen: false }),
}));
