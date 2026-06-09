import { NextResponse } from 'next/server';
import { checkRateLimit, recordRateLimitHit, getClientIp } from './rateLimit';

/**
 * General-purpose API rate limiting, layered on the in-memory primitive in
 * ./rateLimit. Goal: stop a single client from running up Yandex VM / S3 /
 * email cost (or knocking the box over) WITHOUT getting in the way of real
 * shoppers. Limits are tuned generously — a human session never reaches them;
 * only scripts/abuse do.
 *
 * Identity model:
 *   - Authenticated calls are keyed by user id — stable, NAT-proof (many users
 *     behind one mobile-carrier IP don't share a budget), and immune to
 *     X-Forwarded-For spoofing.
 *   - Anonymous calls fall back to the client IP. IP is spoofable via XFF, so
 *     these per-IP caps are a backstop only; the real volumetric defense is an
 *     nginx `limit_req` zone in front of Node (see CLAUDE.md → General API
 *     Rate Limiting). App-level limiting can't stop a distributed flood — the
 *     request has already reached Node — so nginx is what actually saves cost
 *     under a real flood.
 *
 * Storage note: same single-VM, pm2 fork-mode assumption as ./rateLimit. State
 * lives in the process heap and resets on deploy. If the app ever scales to
 * cluster mode or multiple VMs, the primitive moves to a shared store
 * (Redis/Postgres) and this file is unaffected.
 */

export interface RateTier {
  /** Max requests allowed per identity within the window. */
  limit: number;
  /** Sliding-window length in ms. */
  windowMs: number;
}

const MIN = 60_000;

/**
 * Named cost tiers. Numbers are deliberately roomy: a real user never hits them
 * in a minute, so legitimate shopping (browsing, cart edits, one checkout) is
 * never blocked — they only bite automated abuse.
 */
export const RATE_TIERS = {
  /** Order creation: DB writes + a Freekassa API call per hit. */
  checkout: { limit: 10, windowMs: MIN },
  /** Avatar upload: Yandex S3 storage + egress — the real metered-$$ endpoint. */
  upload: { limit: 6, windowMs: MIN },
  /** Account-state writes (reviews, account deletion). */
  write: { limit: 6, windowMs: MIN },
  /** Promocode checks — brute-force-sensitive, but legit users retry a few. */
  promocode: { limit: 20, windowMs: MIN },
  /** Account creation / password reset (already OTP- or token-gated). */
  auth: { limit: 8, windowMs: MIN },
  /** Chatty authenticated writes (cart sync fires on every cart change). */
  sync: { limit: 60, windowMs: MIN },
  /** Public reads (catalog addons, reviews feed, events) — very generous. */
  read: { limit: 120, windowMs: MIN },
} as const;

const DEFAULT_MESSAGE =
  'Слишком много запросов. Пожалуйста, подождите немного и попробуйте снова.';

/**
 * Enforce a tier for one request. Returns a ready-to-return 429 NextResponse
 * when the caller is over the limit, or null to proceed (a hit is recorded on
 * every allowed call — "every request counts" semantics).
 *
 * @param req        incoming request (used for the client IP fallback)
 * @param bucket     short namespace, e.g. 'checkout' — keeps tiers independent
 * @param tier       one of RATE_TIERS
 * @param identifier stable caller id (user id) when known; null/undefined → IP
 * @param message    optional Russian override for the 429 body
 *
 * Usage:
 *   const limited = enforceRateLimit(req, 'checkout', RATE_TIERS.checkout, userId);
 *   if (limited) return limited;
 */
export function enforceRateLimit(
  req: Request,
  bucket: string,
  tier: RateTier,
  identifier?: string | null,
  message?: string,
): NextResponse | null {
  const id = identifier ? `u:${identifier}` : `ip:${getClientIp(req.headers)}`;
  const key = `rl:${bucket}:${id}`;

  const res = checkRateLimit(key, tier.limit, tier.windowMs);
  if (!res.success) {
    return NextResponse.json(
      { error: message ?? DEFAULT_MESSAGE },
      { status: 429, headers: { 'Retry-After': String(res.retryAfterSec) } },
    );
  }
  recordRateLimitHit(key, tier.windowMs);
  return null;
}
