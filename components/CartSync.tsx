"use client";

import { useEffect } from "react";
import { useCart } from "@/store/useCart";
import { useSession } from "next-auth/react";

/**
 * CartSync component - handles syncing cart between localStorage and DB
 * Should be mounted once at the app root level
 */
export default function CartSync() {
  const { loadFromDb } = useCart();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only load from DB when user is authenticated
    if (status === "authenticated" && session?.user) {
      loadFromDb();
    }
  }, [status, session, loadFromDb]);

  return null; // This component doesn't render anything
}
