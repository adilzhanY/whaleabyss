"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/useCart";

/**
 * True only after hydration. `useSyncExternalStore` with a never-firing
 * subscribe gives this for free — the server snapshot is `false`, the client
 * snapshot is `true` — and unlike the usual `useEffect(() => setMounted(true))`
 * it doesn't set state inside an effect (which `react-hooks/set-state-in-effect`
 * rightly flags as a cascading render).
 */
const noopSubscribe = () => () => {};
const useHasHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/**
 * One-tap cart on mobile.
 *
 * Below lg the header bar carries only burger + profile, so the cart sits
 * inside the burger sheet — two taps and a menu scan away from the thing the
 * site sells. This floats it into thumb reach. From lg up it is hidden
 * entirely (`.cart-fab` handles the breakpoint in CSS): the header already has
 * a labelled cart button there, and two entry points on one screen is worse
 * than one.
 *
 * It is a READER of the cart store, never a writer of items — `openCart()` only
 * flips `isOpen`. So it cannot interact with the sync serialisation, the
 * revision guard, or the merge-on-login rules in store/useCart.ts.
 */
export default function CartFab() {
  const pathname = usePathname();
  // Selector returning a primitive: re-renders exactly when the number changes,
  // and reuses `cartCount()` so the per-day-service rule (a 365-day booking is
  // ONE line, not 365) stays defined in one place. Subscribing to the whole
  // store instead would re-render this on every unrelated cart mutation.
  const count = useCart((s) => s.cartCount());
  const isCartOpen = useCart((s) => s.isOpen);
  const openCart = useCart((s) => s.openCart);

  // `items` is persisted to localStorage, so the server renders 0 and the
  // client rehydrates to the real count. Gate the BADGE on hydration (the
  // button itself is static and renders immediately, so it doesn't pop in).
  const hasHydrated = useHasHydrated();

  // /cart IS the cart, and its mobile pay bar owns the bottom edge — covering
  // the primary CTA of a checkout page to offer a shortcut to that same page
  // is all cost and no benefit. Admin and the booster portal have their own
  // shells and no customer cart.
  if (
    pathname === "/cart" ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/portal")
  ) {
    return null;
  }

  // The drawer is z-50 and covers the screen on mobile; a button hovering over
  // it would just be a second, worse close affordance.
  if (isCartOpen) return null;

  const showBadge = hasHydrated && count > 0;

  return (
    <button
      type="button"
      onClick={openCart}
      className="cart-fab"
      aria-label={showBadge ? `Корзина, товаров: ${count}` : "Корзина, пусто"}
    >
      <ShoppingCart className="h-6 w-6" aria-hidden="true" />
      {showBadge && (
        // Capped like the header badge so the two never disagree on the same
        // cart. aria-hidden: the count is already in the button's label, and
        // "9+" is not something a screen reader should read out separately.
        <span className="cart-fab__badge" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
