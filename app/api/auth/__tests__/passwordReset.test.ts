// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { users, passwordResetTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";

// forgot-password returns a BYTE-IDENTICAL body for existing/non-existing emails
// while spending the budget on both; reset-password deletes the token on use AND
// on expiry (a surviving token is an account-takeover window). See TEST_PLAN §C4.
const h = vi.hoisted(() => ({
  db: null as unknown as TestDb,
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: h.sendPasswordResetEmail }));
// reset-password uses the apiRateLimit wrapper — neutralise it.
vi.mock("@/lib/apiRateLimit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
  RATE_TIERS: { auth: { limit: 8, windowMs: 60000 } },
}));
// keep bcrypt fast + deterministic
vi.mock("bcrypt", () => ({ default: { hash: vi.fn().mockResolvedValue("HASHED") }, hash: vi.fn().mockResolvedValue("HASHED") }));

import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as reset } from "@/app/api/auth/reset-password/route";

let db: TestDb;
let uniq = 0;
beforeEach(async () => {
  vi.stubEnv("NEXTAUTH_URL", "https://whaleabyss.ru");
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.sendPasswordResetEmail.mockClear().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

function forgotReq(email: string, ip = `9.0.${uniq++}.1`) {
  return forgot(
    new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
    })
  );
}
function resetReq(token: string, password: string) {
  return reset(
    new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
      headers: { "content-type": "application/json" },
    })
  );
}

describe("forgot-password — no enumeration", () => {
  it("found vs not-found return an identical body and status; email only in the found case", async () => {
    await db.insert(users).values({ username: "real", email: "real@x.ru" });
    const found = await forgotReq("real@x.ru");
    const missing = await forgotReq("ghost@x.ru");
    expect(found.status).toBe(missing.status);
    expect(await found.json()).toEqual(await missing.json());
    expect(h.sendPasswordResetEmail).toHaveBeenCalledTimes(1); // only for the real account
  });

  it("3 requests for one email → the 4th is 429, regardless of existence", async () => {
    // A fresh email key — the limiter is a module singleton shared across tests.
    const email = "burst-only@x.ru";
    const ip = "9.9.9.9";
    for (let i = 0; i < 3; i++) expect((await forgotReq(email, ip)).status).toBe(200);
    expect((await forgotReq(email, ip)).status).toBe(429);
  });

  it("the token is 64 hex chars, matches the row, expiresAt ≈ now+1h; old tokens deleted first", async () => {
    await db.insert(users).values({ username: "real", email: "real@x.ru" });
    // Pre-existing token that must be removed before the insert.
    await db.insert(passwordResetTokens).values({
      email: "real@x.ru",
      token: "old".padEnd(64, "0"),
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const before = Date.now();
    await forgotReq("real@x.ru");
    const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.email, "real@x.ru"));
    expect(rows).toHaveLength(1); // old one gone
    expect(rows[0].token).toMatch(/^[0-9a-f]{64}$/);
    const url = h.sendPasswordResetEmail.mock.calls[0][1] as string;
    expect(url).toContain(rows[0].token);
    const delta = new Date(rows[0].expiresAt).getTime() - before;
    expect(delta).toBeGreaterThan(59 * 60_000);
    expect(delta).toBeLessThan(61 * 60_000);
  });
});

describe("reset-password — single use", () => {
  async function seedTokenFor(email: string, over: Partial<typeof passwordResetTokens.$inferInsert> = {}) {
    await db.insert(users).values({ username: `u${uniq++}`, email });
    const token = `tok${uniq}`.padEnd(64, "a");
    await db.insert(passwordResetTokens).values({
      email,
      token,
      expiresAt: new Date(Date.now() + 3600_000),
      ...over,
    });
    return token;
  }

  it("a valid token updates the password and deletes the token; a replay is 400", async () => {
    const token = await seedTokenFor("acct@x.ru");
    const res = await resetReq(token, "newpass123");
    expect(res.status).toBe(200);

    const [u] = await db.select().from(users).where(eq(users.email, "acct@x.ru"));
    expect(u.passwordHash).toBe("HASHED");
    expect(await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token))).toHaveLength(0);

    // Replay with the now-deleted token → 400 (takeover window closed).
    const replay = await resetReq(token, "another123");
    expect(replay.status).toBe(400);
  });

  it("an expired token → 400 AND the expired row is deleted", async () => {
    const token = await seedTokenFor("exp@x.ru", { expiresAt: new Date(Date.now() - 1000) });
    const res = await resetReq(token, "newpass123");
    expect(res.status).toBe(400);
    expect(await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token))).toHaveLength(0);
  });

  it("password shorter than 6 → 400 before any DB read", async () => {
    const selectSpy = vi.spyOn(h.db, "select");
    const res = await resetReq("sometoken", "12345");
    expect(res.status).toBe(400);
    expect(selectSpy).not.toHaveBeenCalled();
    selectSpy.mockRestore();
  });

  it("updates by users.email = token.email (the OAuth-user-gains-a-password path)", async () => {
    // A user created with NULL passwordHash (OAuth) gains one via this flow.
    await db.insert(users).values({ username: "oauth", email: "oauth@x.ru", passwordHash: null });
    const token = "oauthtoken".padEnd(64, "b");
    await db.insert(passwordResetTokens).values({ email: "oauth@x.ru", token, expiresAt: new Date(Date.now() + 3600_000) });
    await resetReq(token, "firstpass1");
    const [u] = await db.select().from(users).where(eq(users.email, "oauth@x.ru"));
    expect(u.passwordHash).toBe("HASHED");
  });
});
