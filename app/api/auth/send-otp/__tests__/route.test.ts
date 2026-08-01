// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { otps, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The ORDERING is the design: captcha → rate check → record → DB → send. Moving
// the rate check before the captcha lets bots burn a victim's 5-email budget
// with unsolved probes; moving the send before recordRateLimitHit is an
// email-bombing incident. See TEST_PLAN §C3.
const h = vi.hoisted(() => ({
  db: null as unknown as TestDb,
  verifySmartCaptcha: vi.fn(),
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/lib/smartcaptcha", () => ({ verifySmartCaptcha: h.verifySmartCaptcha }));
vi.mock("@/lib/email", () => ({ sendOtpEmail: h.sendOtpEmail }));

import { POST } from "@/app/api/auth/send-otp/route";

let db: TestDb;
let uniq = 0;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.verifySmartCaptcha.mockReset().mockResolvedValue(true);
  h.sendOtpEmail.mockClear().mockResolvedValue(undefined);
});

/** Unique email + IP per call unless pinned, so the real limiter can't bleed across tests. */
function post(over: { email?: string; username?: string; ip?: string } = {}) {
  const email = over.email ?? `u${uniq++}@x.ru`;
  const ip = over.ip ?? `10.0.${uniq}.${(uniq * 7) % 250}`;
  return POST(
    new Request("http://localhost/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email, username: over.username ?? `name${uniq}`, captchaToken: "tok" }),
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
    })
  );
}

describe("POST /api/auth/send-otp", () => {
  it("captcha false → 400, no DB writes, no email, and the email budget is untouched", async () => {
    const email = "victim@x.ru";
    const ip = "5.5.5.5";
    h.verifySmartCaptcha.mockResolvedValueOnce(false);
    const res = await post({ email, ip });
    expect(res.status).toBe(400);
    expect(await db.select().from(otps)).toHaveLength(0);
    expect(h.sendOtpEmail).not.toHaveBeenCalled();

    // Budget intact: 5 real (captcha-true) sends to the same email all succeed.
    for (let i = 0; i < 5; i++) {
      const ok = await post({ email, ip });
      expect(ok.status).toBe(200);
    }
    expect(h.sendOtpEmail).toHaveBeenCalledTimes(5);
  });

  it("5 sends to one email → the 6th is 429 with a numeric Retry-After; email sent exactly 5×", async () => {
    const email = "cap@x.ru";
    const ip = "6.6.6.6";
    for (let i = 0; i < 5; i++) expect((await post({ email, ip })).status).toBe(200);
    const res = await post({ email, ip });
    expect(res.status).toBe(429);
    expect(Number.isInteger(Number(res.headers.get("Retry-After")))).toBe(true);
    expect(h.sendOtpEmail).toHaveBeenCalledTimes(5);
  });

  it("20 sends from one IP across distinct emails → the 21st is 429", async () => {
    const ip = "7.7.7.7";
    for (let i = 0; i < 20; i++) expect((await post({ ip })).status).toBe(200);
    expect((await post({ ip })).status).toBe(429);
  });

  it("the existing-email 409 path still consumed a budget hit", async () => {
    const email = "taken@x.ru";
    const ip = "8.8.8.8";
    await db.insert(users).values({ username: "taken", email });
    // 5 attempts all 409 (email taken) but each spends a hit; the 6th is 429.
    for (let i = 0; i < 5; i++) expect((await post({ email, ip })).status).toBe(409);
    expect((await post({ email, ip })).status).toBe(429);
  });

  it("the inserted OTP is 6 digits with expiresAt ≈ now + 15 min", async () => {
    const email = "new@x.ru";
    const before = Date.now();
    await post({ email });
    const [row] = await db.select().from(otps).where(eq(otps.email, email));
    expect(row.code).toMatch(/^\d{6}$/);
    const delta = new Date(row.expiresAt).getTime() - before;
    expect(delta).toBeGreaterThan(14 * 60_000);
    expect(delta).toBeLessThan(16 * 60_000);
  });
});
