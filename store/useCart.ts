import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  quantity: number;
  image?: string;
  startDate?: string;
  endDate?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
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

      removeFromCart: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        // Sync to DB after removing
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: quantity > 0
            ? state.items.map((i) => (i.id === id ? { ...i, quantity } : i))
            : state.items.filter((i) => i.id !== id)
        }));
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
          set({ items: dbItems });
        } catch (error) {
          console.error('Failed to load cart from DB:', error);
        }
      },
    }),
    {
      name: 'cart-storage',
      // only persist items to avoid opening the cart automatically on refresh
      partialize: (state) => ({ items: state.items }),
    }
  )
);
