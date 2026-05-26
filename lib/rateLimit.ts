/**
 * In-memory sliding-window rate limiter.
 *
 * Fits the current deployment: a single pm2 (fork-mode) Node process on one VM.
 * State lives in the process heap, so it adds zero infrastructure and zero
 * network latency, and it can never fail-closed on an external dependency.
 *
 * Known trade-offs:
 *   - Counters reset on every deploy/restart. Acceptable: deploys are rare and
 *     an attacker can't time them.
 *   - State is per-process. If the app is ever scaled to pm2 cluster mode or
 *     multiple VMs, this MUST move to a shared store (Redis / Postgres). The
 *     exported API hides the storage, so only this file changes if that day comes.
 *
 * Usage patterns:
 *   - "Every request counts" (e.g. sending an email): checkRateLimit() for each
 *     dimension, reject if any is over, then recordRateLimitHit() for each.
 *   - "Account lockout" (login): checkRateLimit() up front, recordRateLimitHit()
 *     only on failure, resetRateLimit() on success.
 */

export interface RateLimitResult {
  /** false => currently over the limit. */
  success: boolean;
  /** Remaining allowance in the current window. */
  remaining: number;
  /** Seconds until the window frees up (0 when allowed). */
  retryAfterSec: number;
}

const hits = new Map<string, number[]>();

/** Drop expired timestamps for a key and return the live ones. */
function prune(key: string, windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  const live = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (live.length) hits.set(key, live);
  else hits.delete(key);
  return live;
}

/** Inspect the current state for a key WITHOUT recording a hit. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const live = prune(key, windowMs);
  if (live.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((live[0] + windowMs - Date.now()) / 1000));
    return { success: false, remaining: 0, retryAfterSec };
  }
  return { success: true, remaining: limit - live.length, retryAfterSec: 0 };
}

/** Record one hit against a key. */
export function recordRateLimitHit(key: string, windowMs: number): void {
  const live = prune(key, windowMs);
  live.push(Date.now());
  hits.set(key, live);
}

/** Forget a key entirely (e.g. on successful login, forgiving prior failures). */
export function resetRateLimit(key: string): void {
  hits.delete(key);
}

/**
 * Best-effort client IP from proxy headers. nginx in front of the app sets
 * X-Forwarded-For; the left-most entry is the (spoofable) original client, so
 * treat per-IP limits as defense-in-depth and rely on per-target keys (email)
 * for the real abuse protection. Accepts a Headers object (route handlers) or a
 * plain header map (the object NextAuth passes to `authorize`).
 */
export function getClientIp(
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
): string {
  const read = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const v = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };
  const xff = read("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return read("x-real-ip")?.trim() || "unknown";
}

// Periodically reclaim memory from keys that are no longer active. Lazy pruning
// in check/record keeps active keys correct; this sweep only drops abandoned
// ones. Unref'd so it never keeps the process alive on its own.
const SWEEP_INTERVAL_MS = 10 * 60_000;
const MAX_RETENTION_MS = 60 * 60_000;
const sweep = setInterval(() => {
  const cutoff = Date.now() - MAX_RETENTION_MS;
  for (const [key, stamps] of hits) {
    const live = stamps.filter((t) => t > cutoff);
    if (live.length) hits.set(key, live);
    else hits.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweep.unref?.();
