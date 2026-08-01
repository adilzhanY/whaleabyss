"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import OrderEventModal, { type OrderEvent } from "./OrderEventModal";

/**
 * Watches for unseen order events («оплата прошла» / «заказ выполнен») and
 * shows the celebration modal exactly once per order — the server flag is
 * acked the moment the modal opens, so a refresh or second tab can't repeat it.
 *
 * Suppressed on /cart (the customer is mid-payment there; the event waits and
 * fires after they return, e.g. to the home page) and on /admin + /portal
 * (back-office). Polls a light endpoint every 30s while the tab is visible;
 * landing on a new page triggers an immediate check plus two quick retries —
 * that covers the Freekassa webhook landing a few seconds after the customer
 * is redirected back to the site.
 */
const SUPPRESSED = (path: string | null) =>
  !path || path === "/cart" || path.startsWith("/admin") || path.startsWith("/portal");

export default function OrderEventWatcher() {
  const { status } = useSession();
  const pathname = usePathname();
  const [event, setEvent] = useState<OrderEvent | null>(null);
  // Sticky guard: while an event is showing (or just closed and we're between
  // polls), don't fetch — one modal at a time, no double-fire from fast polls.
  const busyRef = useRef(false);
  // Latest-request-wins: two checks CAN be in flight at once (busyRef is only
  // set when a response arrives; in dev the first hit also compiles the route,
  // taking seconds). A stale response used to re-open the just-closed modal —
  // its DB read predated the ack. Only the newest request may act.
  const reqIdRef = useRef(0);
  // Never show the same event twice in this tab, whatever the server says —
  // belt and braces on top of the server-side ack.
  const shownRef = useRef<Set<string>>(new Set());

  const check = useCallback(async () => {
    if (busyRef.current || document.visibilityState === "hidden") return;
    const reqId = ++reqIdRef.current;
    try {
      const res = await fetch("/api/user/order-events", { cache: "no-store" });
      if (!res.ok || reqId !== reqIdRef.current) return;
      const data = await res.json();
      if (!data.event || busyRef.current || reqId !== reqIdRef.current) return;
      const eventKey = `${data.event.orderId}:${data.event.type}`;
      if (shownRef.current.has(eventKey)) return;
      shownRef.current.add(eventKey);
      busyRef.current = true;
      setEvent(data.event);
      // The event IS the news that an order changed server-side. Broadcast it
      // so open views (e.g. /orders) refetch immediately instead of waiting
      // for their own poll tick — the list under the modal must already show
      // the new status when the customer closes it.
      window.dispatchEvent(new CustomEvent("wa:orders-changed"));
      // Ack immediately on display — "shown once" must not depend on a click.
      fetch("/api/user/order-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.event.orderId, type: data.event.type }),
      }).catch(() => {});
      // The legacy ReviewPrompt nudge asks for a review too — snooze it for
      // this visit so the customer never gets two popups in one session.
      if (data.event.type === "completed") {
        try {
          sessionStorage.setItem("review-prompt-snoozed", "1");
        } catch {}
      }
    } catch {
      /* network blip — next poll retries */
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || SUPPRESSED(pathname)) return;
    // Near-immediate check + two quick retries (webhook lag after the payment
    // redirect), then a steady 30s poll.
    const quick0 = setTimeout(check, 0);
    const quick1 = setTimeout(check, 2_500);
    const quick2 = setTimeout(check, 7_000);
    const interval = setInterval(check, 30_000);
    return () => {
      clearTimeout(quick0);
      clearTimeout(quick1);
      clearTimeout(quick2);
      clearInterval(interval);
    };
  }, [status, pathname, check]);

  return (
    <OrderEventModal
      event={event}
      onClose={() => {
        setEvent(null);
        busyRef.current = false;
      }}
    />
  );
}
