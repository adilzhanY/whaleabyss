// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  recordRateLimitHit,
  resetRateLimit,
  getClientIp,
} from "@/lib/rateLimit";
import { enforceRateLimit } from "@/lib/apiRateLimit";

// Everything above stands on ~90 lines. A peek that recorded would count blocked
// attempts and never unlock; a fixed bucket would let bursts through. See §C7.
let n = 0;
const uniq = () => `k${n++}:${Math.random()}`;

beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }));
afterEach(() => vi.useRealTimers());

describe("checkRateLimit / recordRateLimitHit — sliding window", () => {
  it("peek never records: 100 checks with limit 5 all succeed with remaining 5", () => {
    const key = uniq();
    for (let i = 0; i < 100; i++) {
      const r = checkRateLimit(key, 5, 60_000);
      expect(r.success).toBe(true);
      expect(r.remaining).toBe(5);
    }
  });

  it("record 5 → blocked; only the oldest hit expiring frees exactly one slot", () => {
    const key = uniq();
    recordRateLimitHit(key, 60_000); // t0
    vi.advanceTimersByTime(1_000);
    for (let i = 0; i < 4; i++) recordRateLimitHit(key, 60_000); // t0+1s

    const blocked = checkRateLimit(key, 5, 60_000);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    // Advance just past the first hit's window (t0+60s), leaving the 4 later ones.
    vi.advanceTimersByTime(59_500); // now t0+60.5s
    const freed = checkRateLimit(key, 5, 60_000);
    expect(freed.success).toBe(true);
    expect(freed.remaining).toBe(1); // 5 - 4 live
  });

  it("resetRateLimit clears only its own key", () => {
    const a = uniq();
    const b = uniq();
    for (let i = 0; i < 5; i++) {
      recordRateLimitHit(a, 60_000);
      recordRateLimitHit(b, 60_000);
    }
    resetRateLimit(a);
    expect(checkRateLimit(a, 5, 60_000).success).toBe(true);
    expect(checkRateLimit(b, 5, 60_000).success).toBe(false);
  });
});

describe("getClientIp", () => {
  it("Headers: leftmost of X-Forwarded-For", () => {
    const hdrs = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(getClientIp(hdrs)).toBe("1.2.3.4");
  });
  it("plain map with the lowercase key NextAuth passes", () => {
    // getClientIp reads the lowercase header name (Node lowercases header keys);
    // it does not fold arbitrary casing on the map, so this mirrors production.
    expect(getClientIp({ "x-forwarded-for": "5.6.7.8" })).toBe("5.6.7.8");
  });
  it("string[] value → first element", () => {
    expect(getClientIp({ "x-forwarded-for": ["9.9.9.9", "8.8.8.8"] })).toBe("9.9.9.9");
  });
  it("x-real-ip fallback", () => {
    expect(getClientIp({ "x-real-ip": "7.7.7.7" })).toBe("7.7.7.7");
  });
  it("nothing → 'unknown'", () => {
    expect(getClientIp(undefined)).toBe("unknown");
    expect(getClientIp({})).toBe("unknown");
  });
});

describe("enforceRateLimit", () => {
  const tier = { limit: 3, windowMs: 60_000 };
  const req = (xff: string) =>
    new NextRequest("http://localhost/x", { headers: { "x-forwarded-for": xff } });

  it("an authenticated identity shares ONE budget across different XFF values", () => {
    const id = uniq();
    expect(enforceRateLimit(req("1.1.1.1"), "checkout", tier, id)).toBeNull();
    expect(enforceRateLimit(req("2.2.2.2"), "checkout", tier, id)).toBeNull();
    expect(enforceRateLimit(req("3.3.3.3"), "checkout", tier, id)).toBeNull();
    // 4th, spoofed IP again — still blocked because the key is the user id.
    const blocked = enforceRateLimit(req("4.4.4.4"), "checkout", tier, id);
    expect(blocked?.status).toBe(429);
  });

  it("anonymous callers get independent per-IP budgets", () => {
    for (let i = 0; i < 3; i++) expect(enforceRateLimit(req("10.0.0.1"), "checkout", tier)).toBeNull();
    expect(enforceRateLimit(req("10.0.0.1"), "checkout", tier)?.status).toBe(429);
    // A different IP is unaffected.
    expect(enforceRateLimit(req("10.0.0.2"), "checkout", tier)).toBeNull();
  });

  it("the same identity has independent counters per bucket", () => {
    const id = uniq();
    for (let i = 0; i < 3; i++) enforceRateLimit(req("1.1.1.1"), "checkout", tier, id);
    expect(enforceRateLimit(req("1.1.1.1"), "checkout", tier, id)?.status).toBe(429);
    // Same id, different bucket → fresh budget.
    expect(enforceRateLimit(req("1.1.1.1"), "sync", tier, id)).toBeNull();
  });

  it("the 429 carries a Russian body and an integer Retry-After; limit passes, limit+1 blocks", async () => {
    const id = uniq();
    for (let i = 0; i < 3; i++) expect(enforceRateLimit(req("1.1.1.1"), "checkout", tier, id)).toBeNull();
    const res = enforceRateLimit(req("1.1.1.1"), "checkout", tier, id)!;
    expect(res.status).toBe(429);
    const retry = res.headers.get("Retry-After");
    expect(Number.isInteger(Number(retry))).toBe(true);
    const body = await res.json();
    expect(body.error).toMatch(/Слишком много/);
  });
});
