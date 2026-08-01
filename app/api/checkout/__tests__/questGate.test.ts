// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { orders, orderItems, services, serviceAddons } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The /api/checkout 409 gate is THE backstop after two revenue incidents. A
// quest-gated service must not become a paid order with no declaration. §B2.
const h = vi.hoisted(() => ({
  db: null as unknown as TestDb,
  getServerSession: vi.fn(),
  createFreekassaOrder: vi.fn().mockResolvedValue({ location: "https://pay/x", fkOrderId: 1 }),
}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({ getServerSession: h.getServerSession }));
vi.mock("@/lib/apiRateLimit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
  RATE_TIERS: { checkout: { limit: 10, windowMs: 60000 } },
}));
vi.mock("@/lib/freekassa", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/freekassa")>()),
  createFreekassaOrder: h.createFreekassaOrder,
}));

import { POST } from "@/app/api/checkout/route";

let db: TestDb;
let parentSlug: string;
let questSlug: string;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.getServerSession.mockResolvedValue(null);

  const [parent] = await db
    .insert(services)
    .values({ slug: "exploration", title: "Map cleaning", price: "1000.00" })
    .returning();
  const [quest] = await db
    .insert(services)
    .values({ slug: "quest-1", title: "Gating quest", price: "500.00" })
    .returning();
  await db.insert(serviceAddons).values({ parentServiceId: parent.id, addonServiceId: quest.id });
  parentSlug = parent.slug;
  questSlug = quest.slug;
});

function post(items: unknown[]) {
  return POST(
    new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ items, email: "c@x.ru", telegram: "@c", adventureRank: 30 }),
      headers: { "content-type": "application/json" },
    })
  );
}
async function orderCount() {
  return (await db.select().from(orders)).length;
}

describe("checkout quest-gate (409)", () => {
  it("parent with no declaration → 409 ADDON_CHOICE_REQUIRED, no order", async () => {
    const res = await post([{ id: parentSlug, quantity: 1 }]);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "ADDON_CHOICE_REQUIRED", slugs: [parentSlug] });
    expect(await orderCount()).toBe(0);
  });

  it("addonChoice 'self' → 200, order_items.addonChoice = 'self'", async () => {
    const res = await post([{ id: parentSlug, quantity: 1, addonChoice: "self" }]);
    expect(res.status).toBe(200);
    const [item] = await db
      .select({ c: orderItems.addonChoice })
      .from(orderItems)
      .innerJoin(services, eq(orderItems.serviceId, services.id))
      .where(eq(services.slug, parentSlug));
    expect(item.c).toBe("self");
  });

  it("addonChoice 'quests' WITH the quest line present → 200", async () => {
    const res = await post([
      { id: parentSlug, quantity: 1, addonChoice: "quests" },
      { id: questSlug, quantity: 1 },
    ]);
    expect(res.status).toBe(200);
  });

  it("addonChoice 'quests' WITHOUT the quest line → 409", async () => {
    const res = await post([{ id: parentSlug, quantity: 1, addonChoice: "quests" }]);
    expect(res.status).toBe(409);
    expect(await orderCount()).toBe(0);
  });

  it("hiding the quest service (isTestService=true) skips the gate — parent stays purchasable", async () => {
    await db.update(services).set({ isTestService: true }).where(eq(services.slug, questSlug));
    const res = await post([{ id: parentSlug, quantity: 1 }]);
    expect(res.status).toBe(200); // gate skipped, not an unpurchasable cart
  });

  it("tampered addonChoice 'hacked' → dropped by the whitelist → treated as undeclared → 409", async () => {
    const res = await post([{ id: parentSlug, quantity: 1, addonChoice: "hacked" }]);
    expect(res.status).toBe(409);
  });
});
