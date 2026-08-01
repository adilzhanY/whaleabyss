// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { services, serviceAddons } from "@/lib/schema";

// The incident's root cause was this route answering both "no quests" and
// "lookup failed" with 200 {addons:[]}. 404 = unresolvable, 503 = failure, and
// NEITHER may carry an `addons` key. See TEST_PLAN §B4.
const h = vi.hoisted(() => ({ db: null as unknown as TestDb, getServerSession: vi.fn() }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({ getServerSession: h.getServerSession }));
vi.mock("@/lib/apiRateLimit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
  RATE_TIERS: { read: { limit: 120, windowMs: 60000 } },
}));

import { GET } from "@/app/api/services/[slug]/addons/route";

let db: TestDb;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.getServerSession.mockResolvedValue(null);
});

function get(slug: string) {
  return GET(new NextRequest(`http://localhost/api/services/${slug}/addons`), {
    params: Promise.resolve({ slug }),
  });
}

describe("GET /api/services/[slug]/addons", () => {
  it("unresolvable parent → 404 with an `error`, never an `addons` key", async () => {
    const res = await get("ghost");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).not.toHaveProperty("addons");
  });

  it("LOAD-BEARING: a failed addon query → 503 with NO `addons` key", async () => {
    // Seed the parent so the first select succeeds, then make the second throw.
    await db.insert(services).values({ slug: "parent", title: "P", price: "100.00" });
    const realSelect = db.select.bind(db);
    let calls = 0;
    vi.spyOn(h.db, "select").mockImplementation((...args: unknown[]) => {
      calls++;
      if (calls === 2) throw new Error("db exploded");
      // @ts-expect-error passthrough
      return realSelect(...args);
    });
    const res = await get("parent");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).not.toHaveProperty("addons"); // a success-shaped error is the whole bug
    vi.restoreAllMocks();
  });

  it("success → addons mapped with id=slug, price parsed, subtitle fallback, image '' when null", async () => {
    const [parent] = await db
      .insert(services)
      .values({ slug: "parent", title: "P", price: "100.00" })
      .returning();
    const [q1] = await db
      .insert(services)
      .values({ slug: "quest-1", title: "Quest One", subtitle: "Sub 1", price: "250.50", imageUrl: "http://img/1.png" })
      .returning();
    const [q2] = await db
      .insert(services)
      .values({ slug: "quest-2", title: "Quest Two", subtitle: null, price: "300.00", imageUrl: null })
      .returning();
    await db.insert(serviceAddons).values([
      { parentServiceId: parent.id, addonServiceId: q1.id, sortOrder: 0 },
      { parentServiceId: parent.id, addonServiceId: q2.id, sortOrder: 1 },
    ]);

    const res = await get("parent");
    expect(res.status).toBe(200);
    const { addons } = await res.json();
    expect(addons).toEqual([
      { id: "quest-1", title: "Quest One", subtitle: "Sub 1", price: 250.5, image: "http://img/1.png" },
      { id: "quest-2", title: "Quest Two", subtitle: "Quest Two", price: 300, image: "" },
    ]);
  });

  it("a test parent is invisible → 404 (isTestService=false filter)", async () => {
    await db.insert(services).values({ slug: "secret", title: "S", price: "100.00", isTestService: true });
    const res = await get("secret");
    expect(res.status).toBe(404);
  });
});
