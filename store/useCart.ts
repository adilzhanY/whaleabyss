import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AddonChoice } from "@/lib/addonChoice";

export interface CartItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  quantity: number;
  image?: string;
  startDate?: string;
  endDate?: string;
  // Quest-addon modal declaration for exploration services (see lib/addonChoice):
  // 'completed' — гейт-квесты региона уже пройдены; 'self' — пройдёт их сам;
  // 'quests' — заказывает квесты отдельными позициями. undefined — выбора не
  // было (у услуги нет аддонов, либо строка старая). Travels cart → checkout →
  // order_items; /api/checkout rejects an undeclared quest-gated line.
  addonChoice?: AddonChoice;
}

// Collapse accidental duplicate lines (same service id) into one entry,
// keeping the first occurrence. Guards against race-condition duplicates
// historically persisted in localStorage or cart_items (parallel syncToDb
// calls used to interleave their delete+insert cycles).
const dedupeById = (items: CartItem[]): CartItem[] => {
  const seen = new Map<string, CartItem>();
  for (const it of items) {
    if (!seen.has(it.id)) seen.set(it.id, it);
  }
  return [...seen.values()];
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  addManyToCart: (
    entries: { item: Omit<CartItem, "quantity">; quantity?: number }[]
  ) => void;
  declareAddon: (
    parentId: string,
    choice: AddonChoice,
    addons?: { item: Omit<CartItem, "quantity">; quantity?: number }[]
  ) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;
  syncToDb: () => Promise<void>;
  loadFromDb: () => Promise<void>;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addToCart: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, ...item, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
        // Sync to DB after adding (fire and forget)
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      // Add several lines in ONE state update + ONE db sync. Used by the
      // quest-addon modal: calling addToCart in a loop fired N concurrent
      // syncToDb requests whose delete+insert cycles interleaved and
      // duplicated cart_items rows.
      addManyToCart: (entries) => {
        set((state) => {
          let items = [...state.items];
          for (const { item, quantity = 1 } of entries) {
            const existing = items.find((i) => i.id === item.id);
            if (existing) {
              items = items.map((i) =>
                i.id === item.id ? { ...i, ...item, quantity: i.quantity + quantity } : i
              );
            } else {
              items = [...items, { ...item, quantity }];
            }
          }
          return { items };
        });
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      // Attach a quest-addon declaration to a line ALREADY in the cart, without
      // touching its quantity, optionally appending the ticked quest lines.
      // Used by QuestAddonModal in 'declare' mode — the re-prompt the cart page
      // opens when /api/checkout rejects an undeclared quest-gated line. Same
      // batching rule as addManyToCart: one state update, one db sync.
      declareAddon: (parentId, choice, addons = []) => {
        set((state) => {
          let items = state.items.map((i) =>
            i.id === parentId ? { ...i, addonChoice: choice } : i
          );
          for (const { item, quantity = 1 } of addons) {
            const existing = items.find((i) => i.id === item.id);
            if (existing) {
              items = items.map((i) =>
                i.id === item.id ? { ...i, ...item, quantity: i.quantity + quantity } : i
              );
            } else {
              items = [...items, { ...item, quantity }];
            }
          }
          return { items };
        });
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      removeFromCart: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        // Sync to DB after removing
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      updateQuantity: (id, quantity) => {
        set((state) => {
          // Dropping below 1 removes the line — same UX as clicking the trash.
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== id) };
          }
          return {
            items: state.items.map((i) => {
              if (i.id !== id) return i;
              // For per-day services (account management) `quantity` is the
              // number of days, and endDate is derived from startDate so the
              // two stay in sync. Recompute endDate = startDate + (qty − 1)
              // whenever qty changes so +/- shifts the period in real time.
              const isPerDay = Boolean(i.startDate && i.endDate);
              if (!isPerDay) {
                return { ...i, quantity };
              }
              const start = new Date(i.startDate as string);
              const newEnd = new Date(start);
              newEnd.setDate(start.getDate() + quantity - 1);
              return {
                ...i,
                quantity,
                endDate: newEnd.toISOString().split("T")[0],
              };
            }),
          };
        });
        // Sync to DB after updating
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      clearCart: () => {
        set({ items: [] });
        // Sync to DB after clearing
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      cartTotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      cartCount: () =>
        get().items.reduce((sum, item) => {
          // Per-day services (account management) carry startDate/endDate and
          // use `quantity` to mean "number of days". For the header badge we
          // want them to count as a single line item regardless of duration —
          // a 365-day purchase shouldn't render as "9+". DB, API, checkout
          // totals and Telegram notifications continue to use the real qty.
          const isPerDay = Boolean(item.startDate && item.endDate);
          return sum + (isPerDay ? 1 : item.quantity);
        }, 0),

      // Sync localStorage cart to database (for logged-in users)
      syncToDb: async () => {
        try {
          const items = get().items;
          const res = await fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          });

          if (!res.ok && res.status !== 401) {
            console.error('Failed to sync cart to DB');
          }
        } catch (error) {
          // Silently fail - user might not be logged in
          console.debug('Cart sync skipped:', error);
        }
      },

      // Load cart from database and replace localStorage
      loadFromDb: async () => {
        try {
          const res = await fetch('/api/cart/load');

          if (!res.ok) {
            if (res.status === 401) {
              // Not logged in, skip
              return;
            }
            throw new Error('Failed to load cart');
          }

          const data = await res.json();
          const dbItems: CartItem[] = data.items || [];

          // Replace strategy: DB is the source of truth for logged-in users
          // This ensures deletions are respected
          set({ items: dedupeById(dbItems) });
        } catch (error) {
          console.error('Failed to load cart from DB:', error);
        }
      },
    }),
    {
      name: 'cart-storage',
      // only persist items to avoid opening the cart automatically on refresh
      partialize: (state) => ({ items: state.items }),
      // Dedupe on rehydrate — cleans up duplicate lines a browser may have
      // persisted before the parallel-sync race was fixed.
      merge: (persisted, current) => ({
        ...current,
        items: dedupeById(
          ((persisted as { items?: CartItem[] } | undefined)?.items) ?? []
        ),
      }),
    }
  )
);
