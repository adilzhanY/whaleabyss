"use client";

import { useEffect, useRef } from "react";
import { cartSyncFailed, useCart } from "@/store/useCart";
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
 * 2. It merges ONLY on the first mount for this account in this browser. The
 *    merge exists because a guest cart exists nowhere else yet — nothing
 *    uploads it before this point — and replacing it destroyed it, which was
 *    its own lost-sale bug via «Войти с Яндексом» (a full-page redirect away
 *    and back, landing on an empty /cart). But merging on EVERY mount let a
 *    stale client union deleted lines back in and re-upload them, which is one
 *    half of «удалил всё, вернулось». Later mounts therefore just read.
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
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    // Already pulled for this account in this tab; a session refetch is not a
    // reason to re-read (and possibly clobber) the cart.
    if (loadedForUserRef.current === userId) return;
    loadedForUserRef.current = userId;

    // Merge ONLY on the real login transition — the first time this browser
    // sees this account. Every later mount (a second tab, a hard reload, a Fast
    // Refresh in dev) does a plain read, so the DB stays authoritative and a
    // client whose copy is behind can no longer union deleted lines back in and
    // push them up. The exception is a cart whose last sync failed: there the
    // browser holds the only copy of a change, and merging is what protects it.
    const merge = !alreadyMerged(userId) || cartSyncFailed();
    if (merge) rememberMerged(userId);
    loadFromDb({ merge });
  }, [status, userId, loadFromDb]);

  return null; // This component doesn't render anything
}
