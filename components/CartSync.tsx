"use client";

import { useEffect, useRef } from "react";
import { cartHasPendingSync, decideCartStartup, useCart } from "@/store/useCart";
import { useSession } from "next-auth/react";

/**
 * Reconciles the browser's cart with the server's once per signed-in account.
 * Mounted once at the app root (app/Providers.tsx).
 *
 * Three things here are deliberate:
 *
 * 1. The effect keys on the user ID, not the `session` object. next-auth hands
 *    back a NEW session object on every refetch — including its refetch on
 *    window focus — and the old `[status, session, loadFromDb]` deps therefore
 *    re-ran this on every tab/app switch. Each run overwrote the cart with the
 *    DB copy, so any sync that had quietly failed (offline, 5xx) silently
 *    reverted the user's cart mid-session. Now it runs once per account.
 *
 * 2. If this browser holds a change the server never confirmed, it PUSHES that
 *    change instead of reading over it. This is the fix for «удалил шесть
 *    товаров, подождал, они вернулись»: the sync that emptied the cart never
 *    landed (tab closed / dev server recompiling / 5xx), the DB kept the six
 *    rows, and the next mount happily called them authoritative. The pending
 *    flag lives in localStorage precisely so it survives the page that set it.
 *
 * 3. It merges ONLY on the first mount for this account in this browser. The
 *    merge exists because a guest cart exists nowhere else yet — nothing
 *    uploads it before this point — and replacing it destroyed it, which was
 *    its own lost-sale bug via «Войти с Яндексом» (a full-page redirect away
 *    and back, landing on an empty /cart). But merging on EVERY mount let a
 *    stale client union deleted lines back in and re-upload them, which is the
 *    other half of «удалил всё, вернулось». Later mounts therefore just read.
 *
 * The choice itself lives in `decideCartStartup` (pure, unit-tested) — these
 * rules have been got wrong before, and a comment is not a guarantee.
 */
const MERGED_KEY = "cart-merged-for";

/** Which account this browser has already merged its guest cart into. */
function alreadyMerged(userId: string) {
  try {
    return localStorage.getItem(MERGED_KEY) === userId;
  } catch {
    return false; // private mode / storage disabled — merging again is the safe side
  }
}

function rememberMerged(userId: string) {
  try {
    localStorage.setItem(MERGED_KEY, userId);
  } catch {
    /* ignore */
  }
}

export default function CartSync() {
  const loadFromDb = useCart((s) => s.loadFromDb);
  const syncToDb = useCart((s) => s.syncToDb);
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    // Already reconciled for this account in this tab; a session refetch is not
    // a reason to re-read (and possibly clobber) the cart.
    if (loadedForUserRef.current === userId) return;
    loadedForUserRef.current = userId;

    const action = decideCartStartup({
      hasPendingSync: cartHasPendingSync(),
      alreadyMerged: alreadyMerged(userId),
    });

    // Either branch means this browser has now been reconciled with the
    // account, so a later mount must not treat itself as a fresh login and
    // union old lines back in.
    rememberMerged(userId);

    if (action === "push") {
      // The local cart is the newer of the two. Upload it; do not read.
      syncToDb().catch((err) => console.error("Failed to push pending cart:", err));
      return;
    }
    loadFromDb({ merge: action === "merge" });
  }, [status, userId, loadFromDb, syncToDb]);

  return null; // This component doesn't render anything
}
