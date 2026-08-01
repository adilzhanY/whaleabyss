// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeDbStub, type DbStub } from "@/test/utils/dbStub";

// Failed-attempts-only limiter, forgives the ACCOUNT key on success (not the IP
// key), checks BEFORE the DB query, NULL passwordHash fails with the byte-
// identical generic message AND consumes a failure hit, email lowercased/trimmed
// into the key, 'RATE_LIMITED' is a wire contract with AuthModal. See §C1.
const h = vi.hoisted(() => ({
  stub: null as unknown as DbStub,
  bcryptCompare: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.stub.db;
  },
}));
vi.mock("bcrypt", () => ({
  default: { compare: h.bcryptCompare },
  compare: h.bcryptCompare,
}));
vi.mock("@/lib/oauthUser", () => ({ getOrCreateUserFromYandex: vi.fn() }));

type Authorize = (
  credentials: Record<string, string> | undefined,
  req: unknown
) => Promise<unknown>;

async function loadAuthorize(): Promise<Authorize> {
  vi.resetModules(); // fresh lib/rateLimit state each call
  const route = await import("@/app/api/auth/[...nextauth]/route");
  const provider = route.authOptions.providers[0] as unknown as {
    options?: { authorize?: Authorize };
    authorize?: Authorize;
  };
  return (provider.options?.authorize ?? provider.authorize)!;
}

const CREDS = { email: "user@x.ru", password: "pw" };
const REQ = { headers: { "x-forwarded-for": "1.2.3.4" } };

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  h.stub = makeDbStub();
  h.bcryptCompare.mockReset();
});
afterEach(() => vi.useRealTimers());

/** Run one failing authorize (queues "user not found") and swallow the throw. */
async function fail(authorize: Authorize, creds = CREDS, req: unknown = REQ) {
  h.stub.queueRows([]); // db.select → no user
  await expect(authorize(creds, req)).rejects.toThrow();
}

describe("authorize — brute-force limiter", () => {
  it("8 failures → the 9th throws RATE_LIMITED before any db.select", async () => {
    const authorize = await loadAuthorize();
    for (let i = 0; i < 8; i++) await fail(authorize);
    const before = h.stub.selectCount();
    await expect(authorize(CREDS, REQ)).rejects.toThrow("RATE_LIMITED");
    expect(h.stub.selectCount()).toBe(before); // db not touched on the blocked call
  });

  it("reset-on-success: 7 failures then a success gives the next streak a fresh 8", async () => {
    const authorize = await loadAuthorize();
    for (let i = 0; i < 7; i++) await fail(authorize);

    // success forgives the account key
    h.stub.queueRows([{ id: "u1", username: "u", email: "user@x.ru", passwordHash: "hash", avatarUrl: null, role: "user" }]);
    h.bcryptCompare.mockResolvedValueOnce(true);
    await expect(authorize(CREDS, REQ)).resolves.toMatchObject({ id: "u1" });

    // 8 more failures are allowed; only the 9th trips.
    for (let i = 0; i < 8; i++) await fail(authorize);
    await expect(authorize(CREDS, REQ)).rejects.toThrow("RATE_LIMITED");
  });

  it("NULL passwordHash → 'User not found' (identical to missing user), bcrypt.compare never called", async () => {
    const authorize = await loadAuthorize();
    h.stub.queueRows([{ id: "u1", username: "u", email: "user@x.ru", passwordHash: null, avatarUrl: null, role: "user" }]);
    await expect(authorize(CREDS, REQ)).rejects.toThrow("User not found");
    expect(h.bcryptCompare).not.toHaveBeenCalled();
  });

  it("30 failures across 30 emails from one IP → the 31st email is RATE_LIMITED (spray cap)", async () => {
    const authorize = await loadAuthorize();
    for (let i = 0; i < 30; i++) await fail(authorize, { email: `u${i}@x.ru`, password: "pw" });
    await expect(authorize({ email: "fresh@x.ru", password: "pw" }, REQ)).rejects.toThrow("RATE_LIMITED");
  });

  it("advancing past the window unlocks the account", async () => {
    const authorize = await loadAuthorize();
    for (let i = 0; i < 8; i++) await fail(authorize);
    await expect(authorize(CREDS, REQ)).rejects.toThrow("RATE_LIMITED");
    vi.advanceTimersByTime(15 * 60_000 + 1_000);
    // Now allowed to reach the DB again → generic failure, not RATE_LIMITED.
    h.stub.queueRows([]);
    await expect(authorize(CREDS, REQ)).rejects.toThrow("User not found");
  });

  it("mixed-case/whitespace email maps to the same account key as the lowercase one", async () => {
    const authorize = await loadAuthorize();
    for (let i = 0; i < 8; i++) await fail(authorize);
    await expect(authorize({ email: "  USER@x.ru ", password: "pw" }, REQ)).rejects.toThrow("RATE_LIMITED");
  });

  it("keys on the LEFTMOST XFF entry from the plain header map production passes", async () => {
    const authorize = await loadAuthorize();
    // 8 failures all with leftmost 'a' (varying the rest) exhaust one account key.
    for (let i = 0; i < 8; i++) await fail(authorize, CREDS, { headers: { "x-forwarded-for": `a, b${i}` } });
    await expect(
      authorize(CREDS, { headers: { "x-forwarded-for": "a, somethingelse" } })
    ).rejects.toThrow("RATE_LIMITED");
    // A different leftmost IP shares neither the account nor the ip key → reaches DB.
    h.stub.queueRows([]);
    await expect(
      authorize(CREDS, { headers: { "x-forwarded-for": "z" } })
    ).rejects.toThrow("User not found");
  });
});
