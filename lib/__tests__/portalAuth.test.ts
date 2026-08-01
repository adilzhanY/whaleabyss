// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { boosters, users } from "@/lib/schema";
import { expectedCut } from "@/lib/portalAuth";

// The role only GATES; the boosters.userId FK is the identity, and an INACTIVE
// roster row must be rejected (the money-visibility gate). See TEST_PLAN §C8.
const h = vi.hoisted(() => ({ db: null as unknown as TestDb, getServerSession: vi.fn() }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({ getServerSession: h.getServerSession }));

import { getBoosterContext } from "@/lib/portalAuth";

let db: TestDb;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.getServerSession.mockReset();
});

async function seedBoosterFor(userId: string, status: "active" | "inactive" = "active") {
  const [b] = await db
    .insert(boosters)
    .values({ userId, firstName: "B", lastName: "O", status })
    .returning();
  return b;
}

describe("getBoosterContext", () => {
  it("role 'admin' → null via the role gate, before any db call", async () => {
    const spy = vi.spyOn(h.db, "select");
    h.getServerSession.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    expect(await getBoosterContext()).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("role 'booster' but no roster row → null", async () => {
    // A real UUID with no linked booster row (the orphaned-role case).
    h.getServerSession.mockResolvedValue({
      user: { id: "11111111-1111-1111-1111-111111111111", role: "booster" },
    });
    expect(await getBoosterContext()).toBeNull();
  });

  it("an INACTIVE roster row → null (money-visibility gate)", async () => {
    const [u] = await db.insert(users).values({ username: "b", email: "b@x.ru", role: "booster" }).returning();
    await seedBoosterFor(u.id, "inactive");
    h.getServerSession.mockResolvedValue({ user: { id: u.id, role: "booster" } });
    expect(await getBoosterContext()).toBeNull();
  });

  it("happy path → { userId, booster }", async () => {
    const [u] = await db.insert(users).values({ username: "b", email: "b@x.ru", role: "booster" }).returning();
    const b = await seedBoosterFor(u.id, "active");
    h.getServerSession.mockResolvedValue({ user: { id: u.id, role: "booster" } });
    const ctx = await getBoosterContext();
    expect(ctx?.userId).toBe(u.id);
    expect(ctx?.booster.id).toBe(b.id);
  });
});

describe("expectedCut — cent rounding", () => {
  it("rounds to the nearest cent", () => {
    expect(expectedCut("1000.00", 40)).toBe(400);
    expect(expectedCut("999.99", 40)).toBe(400); // Math.round(39999.6)/100
  });
});
