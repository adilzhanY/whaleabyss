// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { users, otps } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Expiry is checked BEFORE the code match (and the dead row deleted with it),
// and a wrong guess now costs an attempt: five misses burn the code. Without
// that a miss was free — the row was deleted only on success, so the only
// ceiling was the auth rate tier. See TEST_PLAN §C9, AUDIT_FINDINGS §1.4.
const h = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("bcrypt", () => ({ default: { hash: vi.fn().mockResolvedValue("HASHED") }, hash: vi.fn().mockResolvedValue("HASHED") }));

import { POST } from "@/app/api/auth/register/route";

let db: TestDb;
let uniq = 0;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
});

async function seedOtp(email: string, code: string, expiresAt = new Date(Date.now() + 15 * 60_000)) {
  await db.insert(otps).values({ email, code, expiresAt });
}
function post(body: Record<string, unknown>, ip = `12.0.${uniq++}.1`) {
  return POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
    })
  );
}
const otpRows = (email: string) => db.select().from(otps).where(eq(otps.email, email));

describe("POST /api/auth/register", () => {
  it("wrong OTP → 400 «Неверный код», the row survives but the attempt is counted", async () => {
    await seedOtp("a@x.ru", "123456");
    const res = await post({ username: "a", email: "a@x.ru", password: "secret1", otp: "000000" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Неверный код/);
    const [row] = await otpRows("a@x.ru");
    expect(row.attempts).toBe(1); // a miss is no longer free
  });

  it("the 5th wrong guess burns the code instead of leaving it guessable", async () => {
    await seedOtp("brute@x.ru", "123456");
    for (let i = 1; i <= 4; i++) {
      const res = await post({ username: "brute", email: "brute@x.ru", password: "secret1", otp: "000000" });
      expect((await res.json()).error).toMatch(/Неверный код/);
      const [row] = await otpRows("brute@x.ru");
      expect(row.attempts).toBe(i);
    }

    const res = await post({ username: "brute", email: "brute@x.ru", password: "secret1", otp: "000000" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Слишком много неверных попыток/);
    expect(await otpRows("brute@x.ru")).toHaveLength(0);

    // Even the CORRECT code is dead now — the attacker has to request a new one,
    // which costs them a send from send-otp's own per-email budget.
    const after = await post({ username: "brute", email: "brute@x.ru", password: "secret1", otp: "123456" });
    expect((await after.json()).error).toMatch(/не найден/i);
  });

  it("expired but correct code → 400 «Код истек» and the dead row is deleted", async () => {
    await seedOtp("b@x.ru", "123456", new Date(Date.now() - 1000));
    const res = await post({ username: "b", email: "b@x.ru", password: "secret1", otp: "123456" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/истек/i);
    // Otherwise an expired code lingers and absorbs guesses for free.
    expect(await otpRows("b@x.ru")).toHaveLength(0);
  });

  it("success → user with receiptEmail=email and a hash, THEN the otp is deleted", async () => {
    await seedOtp("c@x.ru", "123456");
    const res = await post({ username: "c", email: "c@x.ru", password: "secret1", otp: "123456" });
    expect(res.status).toBe(201);
    const [u] = await db.select().from(users).where(eq(users.email, "c@x.ru"));
    expect(u.receiptEmail).toBe("c@x.ru");
    expect(u.passwordHash).toBe("HASHED");
    expect(await otpRows("c@x.ru")).toHaveLength(0);
  });

  it("a unique-constraint violation (23505) → 409 with the generic combined message", async () => {
    await seedOtp("new2@x.ru", "123456");
    // node-postgres surfaces a duplicate-key error with `.code === '23505'` at
    // the top level (PGlite wraps it, so we throw the prod-shaped error directly).
    const spy = vi.spyOn(h.db, "insert").mockImplementation(() => {
      throw Object.assign(new Error("duplicate key"), { code: "23505" });
    });
    const res = await post({ username: "dup", email: "new2@x.ru", password: "secret1", otp: "123456" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Имя пользователя или email/);
    spy.mockRestore();
  });

  it("password shorter than 6 → 400 before any DB read", async () => {
    const spy = vi.spyOn(h.db, "select");
    const res = await post({ username: "d", email: "d@x.ru", password: "12345", otp: "123456" });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("the 9th call in a minute from one IP → 429 (auth tier = 8)", async () => {
    const ip = "13.13.13.13";
    for (let i = 0; i < 8; i++) {
      // Missing fields → 400, but each still consumes a rate-limit hit.
      await post({ username: "", email: "", password: "", otp: "" }, ip);
    }
    const res = await post({ username: "x", email: "x@x.ru", password: "secret1", otp: "1" }, ip);
    expect(res.status).toBe(429);
  });
});
