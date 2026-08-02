// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { users, otps } from "@/lib/schema";
import { eq } from "drizzle-orm";

// `users.email` is a case-sensitive varchar with a UNIQUE constraint, so every
// entry point has to spell an identity email the same way or they stop pointing
// at the same row. They didn't: authorize() lowercased, register inserted raw —
// an account created as `User@X.ru` could never be logged into again. These
// tests run the REAL routes against a real Postgres so the normalisation is
// asserted end to end, not per-function. See AUDIT_FINDINGS §1.5.
const h = vi.hoisted(() => ({
  db: null as unknown as TestDb,
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  verifySmartCaptcha: vi.fn().mockResolvedValue(true),
  bcryptHash: vi.fn().mockResolvedValue("HASHED"),
  bcryptCompare: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/lib/email", () => ({ sendOtpEmail: h.sendOtpEmail }));
vi.mock("@/lib/smartcaptcha", () => ({ verifySmartCaptcha: h.verifySmartCaptcha }));
vi.mock("bcrypt", () => ({
  default: { hash: h.bcryptHash, compare: h.bcryptCompare },
  hash: h.bcryptHash,
  compare: h.bcryptCompare,
}));
vi.mock("@/lib/apiRateLimit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
  RATE_TIERS: { auth: { limit: 8, windowMs: 60000 } },
}));

import { POST as sendOtp } from "@/app/api/auth/send-otp/route";
import { POST as register } from "@/app/api/auth/register/route";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type Authorize = (
  credentials: Record<string, string> | undefined,
  req: unknown
) => Promise<{ id: string; email: string } | null>;

const authorize = (() => {
  const provider = authOptions.providers[0] as unknown as {
    options?: { authorize?: Authorize };
    authorize?: Authorize;
  };
  return (provider.options?.authorize ?? provider.authorize)!;
})();

let db: TestDb;
let uniq = 0;
const ip = () => `7.0.${uniq++}.1`;

beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.sendOtpEmail.mockClear();
  h.verifySmartCaptcha.mockClear().mockResolvedValue(true);
  // The stored hash is the literal "HASHED"; any password matches it.
  h.bcryptCompare.mockReset().mockImplementation(async (_pw, hash) => hash === "HASHED");
});
afterEach(() => vi.clearAllMocks());

const otpReq = (body: Record<string, unknown>) =>
  sendOtp(
    new Request("http://localhost/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ captchaToken: "tok", ...body }),
      headers: { "content-type": "application/json", "x-forwarded-for": ip() },
    })
  );

const registerReq = (body: Record<string, unknown>) =>
  register(
    new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", "x-forwarded-for": ip() },
    })
  );

const login = (email: string) =>
  authorize({ email, password: "secret1" }, { headers: { "x-forwarded-for": ip() } });

/** Run the real send-otp → register pair and return the stored row. */
async function signUp(email: string, username: string) {
  const sent = await otpReq({ email, username });
  expect(sent.status).toBe(200);
  const [row] = await db.select().from(otps);
  const res = await registerReq({ username, email, password: "secret1", otp: row.code });
  return { res, code: row.code };
}

describe("email case is normalised across every auth entry point", () => {
  it("an account registered with mixed case can log in with EITHER spelling", async () => {
    const { res } = await signUp("User@X.ru", "mixed");
    expect(res.status).toBe(201);

    // Stored lowercased, so every other lookup in the app finds it.
    const [stored] = await db.select().from(users);
    expect(stored.email).toBe("user@x.ru");

    // This is the regression: before the fix authorize() lowercased the input
    // and found nothing, so the account was unreachable with its own spelling.
    await expect(login("User@X.ru")).resolves.toMatchObject({ email: "user@x.ru" });
    await expect(login("user@x.ru")).resolves.toMatchObject({ email: "user@x.ru" });
  });

  it("surrounding whitespace does not create a second identity", async () => {
    await signUp("  Spaced@X.ru  ", "spaced");
    const [stored] = await db.select().from(users);
    expect(stored.email).toBe("spaced@x.ru");
    await expect(login("spaced@x.ru")).resolves.toMatchObject({ email: "spaced@x.ru" });
  });

  it("send-otp rejects a case-variant of an existing address with 409, not a later 500", async () => {
    await signUp("Taken@X.ru", "taken");

    // AUDIT_FINDINGS §1.5: the duplicate check compared the raw address, so this
    // passed the 409 and only failed later on the unique constraint.
    const res = await otpReq({ email: "TAKEN@x.RU", username: "someone-else" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/уже зарегистрирован/i);
  });

  it("the OTP issued for one spelling verifies registration under another", async () => {
    const sent = await otpReq({ email: "Case@X.ru", username: "case" });
    expect(sent.status).toBe(200);

    const [row] = await db.select().from(otps);
    expect(row.email).toBe("case@x.ru"); // stored normalised too

    const res = await registerReq({
      username: "case",
      email: "CASE@x.RU", // a different spelling of the same address
      password: "secret1",
      otp: row.code,
    });
    expect(res.status).toBe(201);
    // Consumed, so the code can't be reused.
    expect(await db.select().from(otps).where(eq(otps.email, "case@x.ru"))).toHaveLength(0);
  });
});
