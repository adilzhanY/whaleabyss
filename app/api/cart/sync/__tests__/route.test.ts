// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { cartItems, services, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The trust boundary: a forged addonChoice must never reach a column the admin
// panel renders; the whole cart is replaced in one transaction; slugs resolve in
// ONE select (the latency property the sync-serialisation fix relies on). §B8.
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
  RATE_TIERS: { sync: { limit: 60, windowMs: 60000 } },
}));

import { POST } from "@/app/api/cart/sync/route";

let db: TestDb;
let userId: string;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  const [u] = await db.insert(users).values({ username: "c", email: "c@x.ru" }).returning();
  userId = u.id;
  h.getServerSession.mockResolvedValue({ user: { id: userId } });
  await db.insert(services).values([
    { slug: "a", title: "A", price: "100.00" },
    { slug: "b", title: "B", price: "200.00" },
  ]);
});

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/cart/sync", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    })
  );
}
const rows = () => db.select().from(cartItems).where(eq(cartItems.userId, userId));

describe("POST /api/cart/sync trust boundary", () => {
  it("passes a valid 'quests' addonChoice; drops a forged one to NULL", async () => {
    const res = await post({
      items: [
        { id: "a", quantity: 1, addonChoice: "quests" },
        { id: "b", quantity: 1, addonChoice: "evil" },
      ],
    });
    expect(res.status).toBe(200);
    const stored = await rows();
    const byService = new Map<string, string | null>();
    for (const r of stored) {
      const [svc] = await db.select({ slug: services.slug }).from(services).where(eq(services.id, r.serviceId));
      byService.set(svc.slug, r.addonChoice);
    }
    expect(byService.get("a")).toBe("quests");
    expect(byService.get("b")).toBeNull(); // forged value never reaches the column
  });

  it("an item whose slug isn't resolvable produces no row", async () => {
    await post({ items: [{ id: "a", quantity: 1 }, { id: "ghost", quantity: 1 }] });
    expect(await rows()).toHaveLength(1);
  });

  it("items: [] → delete happens, insert does not, 200 (that IS the 'cart emptied' write)", async () => {
    await db.insert(cartItems).values({ userId, serviceId: (await db.select().from(services))[0].id, quantity: 1 });
    const res = await post({ items: [] });
    expect(res.status).toBe(200);
    expect(await rows()).toHaveLength(0);
  });

  it("no session → 401 and the db is never touched", async () => {
    h.getServerSession.mockResolvedValueOnce(null);
    const selectSpy = vi.spyOn(h.db, "select");
    const res = await post({ items: [{ id: "a", quantity: 1 }] });
    expect(res.status).toBe(401);
    expect(selectSpy).not.toHaveBeenCalled();
    selectSpy.mockRestore();
  });

  it("body {items:'x'} → 400", async () => {
    const res = await post({ items: "x" });
    expect(res.status).toBe(400);
  });

  it("resolves all slugs in ONE select call", async () => {
    const selectSpy = vi.spyOn(h.db, "select");
    await post({ items: [{ id: "a", quantity: 1 }, { id: "b", quantity: 1 }] });
    expect(selectSpy).toHaveBeenCalledTimes(1);
    selectSpy.mockRestore();
  });
});
