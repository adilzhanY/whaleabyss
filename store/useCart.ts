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

// Bumped by every local cart mutation. loadFromDb captures it before its request
// and throws the response away if the user touched the cart meanwhile —
// otherwise a slow GET issued before an add can land after it and silently
// revert the line (including a just-made quest declaration).
let cartRevision = 0;
const bumpRevision = () => {
  cartRevision += 1;
};

/**
 * Sync serialisation — the fix for «удалил всё, перешёл на другую страницу, и
 * товары вернулись».
 *
 * Every mutation used to fire its own un-awaited POST /api/cart/sync, and that
 * route is delete-everything-then-insert-the-payload. Nothing ordered them, and
 * the requests are NOT equally fast: the bigger the payload, the longer the
 * route takes. Deleting items one after another therefore produced requests
 * that got progressively faster, so the older, larger snapshots finished LAST
 * and put the deleted lines straight back. Measured on a real cart: the
 * five-item sync took 1.08 s, the «cart is empty» sync fired 60 ms later took
 * 0.65 s — the empty state was overwritten and the DB kept all five rows. The
 * next page load read them back and the cart «came back».
 *
 * Now at most one request is ever in flight, and each one reads the CURRENT
 * state at the moment it is sent, so the last write is by construction the
 * newest one. Bursts collapse into a single trailing request.
 */
let syncInFlight: Promise<void> | null = null;
let syncQueued = false;
/** True when the most recent sync did not reach the server (offline, 5xx). */
let lastSyncFailed = false;
export const cartSyncFailed = () => lastSyncFailed;

/**
 * Union of the DB cart and the local one, used ONLY on the login transition.
 *
 * Signing in used to replace the local cart with the DB copy outright, so a
 * cart built while signed out was destroyed the moment the user logged in to
 * pay — and for «Войти с Яндексом» that is a full-page redirect, making the
 * loss deterministic. Nothing ever pushed the guest cart up first, so the
 * customer landed back on /cart with nothing in it.
 *
 * DB rows win on quantity/dates (they're authoritative for an existing
 * account), but a line only the browser has is kept, and a quest declaration
 * present on either side survives. Trade-off: an item deleted on another device
 * can reappear here. That is a visible, one-tap annoyance; silently losing the
 * whole cart is a lost sale.
 */
const mergeCarts = (
  dbItems: CartItem[],
  localItems: CartItem[]
): { items: CartItem[]; localContributed: boolean } => {
  const byId = new Map(dbItems.map((i) => [i.id, i]));
  let localContributed = false;
  for (const local of localItems) {
    const existing = byId.get(local.id);
    if (!existing) {
      byId.set(local.id, local);
      localContributed = true;
      continue;
    }
    if (!existing.addonChoice && local.addonChoice) {
      byId.set(local.id, { ...existing, addonChoice: local.addonChoice });
      localContributed = true;
    }
  }
  return { items: [...byId.values()], localContributed };
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
  /**
   * @param merge when true (the login transition), the local cart is unioned
   * into the DB copy instead of being overwritten by it — see mergeCarts.
   */
  loadFromDb: (options?: { merge?: boolean }) => Promise<void>;
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
        bumpRevision();
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
        bumpRevision();
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
        bumpRevision();
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      removeFromCart: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        // Sync to DB after removing
        bumpRevision();
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
        bumpRevision();
        get().syncToDb().catch(err => console.error('Failed to sync cart:', err));
      },

      clearCart: () => {
        set({ items: [] });
        // Sync to DB after clearing
        bumpRevision();
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

      // Push the local cart to the database (logged-in users only).
      //
      // Serialised: concurrent calls collapse into the single in-flight
      // request plus one trailing request that carries the state as it is at
      // send time. See the syncInFlight comment above for why.
      syncToDb: () => {
        syncQueued = true;
        if (syncInFlight) return syncInFlight;

        syncInFlight = (async () => {
          try {
            while (syncQueued) {
              syncQueued = false;
              // Read INSIDE the loop: whatever the user did while the previous
              // request was in flight is what gets sent next.
              const items = get().items;
              try {
                const res = await fetch('/api/cart/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ items }),
                });
                // 401 just means "not logged in" — the cart lives in
                // localStorage and there is nothing to sync.
                lastSyncFailed = !res.ok && res.status !== 401;
                if (lastSyncFailed) console.error('Failed to sync cart to DB');
              } catch (error) {
                lastSyncFailed = true;
                console.debug('Cart sync skipped:', error);
              }
            }
          } finally {
            syncInFlight = null;
          }
        })();

        return syncInFlight;
      },

      // Load the cart from the database for a logged-in user.
      //
      // Default (merge: false) keeps the original replace strategy — the DB is
      // the source of truth, so deletions are respected. On the login
      // transition CartSync passes merge: true, which unions the local cart in
      // instead, so a cart built while signed out survives signing in.
      loadFromDb: async ({ merge = false } = {}) => {
        const revisionAtStart = cartRevision;
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
          const dbItems: CartItem[] = dedupeById(data.items || []);

          // The user changed the cart while this request was in flight — their
          // action is newer than this snapshot, so honour it and drop the read.
          if (cartRevision !== revisionAtStart) return;

          if (!merge) {
            set({ items: dbItems });
            return;
          }

          const { items, localContributed } = mergeCarts(dbItems, get().items);
          set({ items });
          // Push the union up so the DB stops being a stale, smaller copy —
          // without this the very next non-merging load would drop the lines
          // the browser just contributed.
          if (localContributed) {
            get().syncToDb().catch(err => console.error('Failed to sync merged cart:', err));
          }
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
