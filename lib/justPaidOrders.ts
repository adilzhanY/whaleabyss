/**
 * Client-side registry of orders whose Freekassa SUCCESS redirect this browser
 * just saw (`/?order=<id>&status=success`). The DB stays webhook-driven — the
 * success URL is spoofable, so it must never write "paid" — but for THIS
 * customer the redirect is near-certain proof of payment, so the UI may show
 * the order as «Оплачен» immediately instead of «Ожидает оплаты» for the few
 * seconds until the webhook lands.
 *
 * Self-correcting by design:
 * - the real status turning anything ≠ pending removes the marker;
 * - a marker older than TTL expires, so a payment that actually failed falls
 *   back to the truthful «Ожидает оплаты» with no cleanup code anywhere else.
 */

const STORAGE_KEY = "wa:just-paid-orders";
const TTL_MS = 15 * 60_000;

function readMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
    if (dirty) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    return map;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota — optimism is best-effort */
  }
}

export function markJustPaid(orderId: string | null | undefined): void {
  if (!orderId || typeof window === "undefined") return;
  const map = readMap();
  map[orderId] = Date.now() + TTL_MS;
  writeMap(map);
}

export function clearJustPaid(orderId: string): void {
  if (typeof window === "undefined") return;
  const map = readMap();
  if (orderId in map) {
    delete map[orderId];
    writeMap(map);
  }
}

export function isJustPaid(orderId: string): boolean {
  return orderId in readMap();
}

/**
 * The status the CUSTOMER should see: real status always wins except for the
 * one case where we know better — a pending order whose success redirect this
 * browser witnessed. Observing any non-pending status retires the marker.
 */
export function resolveDisplayStatus(order: { id: string; status: string }): string {
  if (order.status !== "pending") {
    clearJustPaid(order.id);
    return order.status;
  }
  return isJustPaid(order.id) ? "paid" : "pending";
}
