/**
 * Client-side registry of order-status facts THIS BROWSER learned before the
 * fetched lists caught up, so cards can render the truth instantly:
 *
 * - "just paid": the Freekassa SUCCESS redirect landed
 *   (`/?order=<id>&status=success`) — show a pending order as «Оплачен»
 *   until the webhook writes the DB;
 * - "just completed": the «заказ выполнен» celebration modal was claimed —
 *   show the order as «Выполнен» even if the list on screen was fetched
 *   before the status change (the refetch broadcast races the render).
 *
 * The DB stays the source of truth — these only bridge the seconds between
 * knowing and refetching, and self-correct: observing a real status at or
 * past the optimistic one retires the marker, and every marker expires after
 * TTL, so a wrong optimism (e.g. a payment that actually failed) falls back
 * to the truthful display with no cleanup code anywhere else.
 */

const PAID_KEY = "wa:just-paid-orders";
const COMPLETED_KEY = "wa:just-completed-orders";
const TTL_MS = 15 * 60_000;

function readMap(key: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return {};
    const map = JSON.parse(raw) as Record<string, number>;
    // Lazy prune: drop expired entries on every read.
    const now = Date.now();
    let dirty = false;
    for (const [id, expiresAt] of Object.entries(map)) {
      if (typeof expiresAt !== "number" || expiresAt < now) {
        delete map[id];
        dirty = true;
      }
    }
    if (dirty) sessionStorage.setItem(key, JSON.stringify(map));
    return map;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, number>) {
  try {
    sessionStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* private mode / quota — optimism is best-effort */
  }
}

function mark(key: string, orderId: string | null | undefined) {
  if (!orderId || typeof window === "undefined") return;
  const map = readMap(key);
  map[orderId] = Date.now() + TTL_MS;
  writeMap(key, map);
}

function clear(key: string, orderId: string) {
  if (typeof window === "undefined") return;
  const map = readMap(key);
  if (orderId in map) {
    delete map[orderId];
    writeMap(key, map);
  }
}

export function markJustPaid(orderId: string | null | undefined): void {
  mark(PAID_KEY, orderId);
}

export function markJustCompleted(orderId: string | null | undefined): void {
  mark(COMPLETED_KEY, orderId);
}

/**
 * The status the CUSTOMER should see. Precedence: real terminal knowledge
 * wins; then "just completed" (upgrades pending/paid/in_progress); then
 * "just paid" (upgrades pending only).
 */
export function resolveDisplayStatus(order: { id: string; status: string }): string {
  if (order.status === "completed" || order.status === "cancelled" || order.status === "refunded") {
    clear(PAID_KEY, order.id);
    clear(COMPLETED_KEY, order.id);
    return order.status;
  }
  if (order.id in readMap(COMPLETED_KEY)) return "completed";
  if (order.status === "pending" && order.id in readMap(PAID_KEY)) return "paid";
  if (order.status !== "pending") clear(PAID_KEY, order.id);
  return order.status;
}
