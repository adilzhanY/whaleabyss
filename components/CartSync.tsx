"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/store/useCart";
import { useSession } from "next-auth/react";

/**
 * Pulls the server-side cart into the store once per signed-in account.
 * Mounted once at the app root (app/Providers.tsx).
 *
 * Two things here are deliberate:
 *
 * 1. The effect keys on the user ID, not the `session` object. next-auth hands
 *    back a NEW session object on every refetch — including its refetch on
 *    window focus — and the old `[status, session, loadFromDb]` deps therefore
 *    re-ran this on every tab/app switch. Each run overwrote the cart with the
 *    DB copy, so any sync that had quietly failed (offline, 5xx) silently
 *    reverted the user's cart mid-session. Now it runs once per account.
 *
 * 2. It loads with `merge: true`. This is the login transition, and the local
 *    cart may be a guest cart that exists nowhere else yet — nothing uploads it
 *    before this point. Replacing instead of merging destroyed it, which was
 *    its own lost-sale bug: it hit hardest via «Войти с Яндексом», where
 *    signing in is a full-page redirect away and back, and the customer
 *    returned to /cart to find it empty. See mergeCarts in store/useCart.
 */
export default function CartSync() {
  const loadFromDb = useCart((s) => s.loadFromDb);
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    // Already pulled for this account in this tab; a session refetch is not a
    // reason to re-read (and possibly clobber) the cart.
    if (loadedForUserRef.current === userId) return;
    loadedForUserRef.current = userId;
    loadFromDb({ merge: true });
  }, [status, userId, loadFromDb]);

  return null; // This component doesn't render anything
}
