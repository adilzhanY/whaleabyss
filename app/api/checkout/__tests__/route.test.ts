// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { orders, orderItems, services, users, promocodes } from "@/lib/schema";

// Server-side price recomputation is the whole security property — the client's
// total/item.price are ignored. That's the stored totalPrice + the amount handed
// to Freekassa, both derived from DB prices. PGlite so those are real. See A1.
const h = vi.hoisted(() => ({
  db: null as unknown as TestDb,
  getServerSession: vi.fn(),
  createFreekassaOrder: vi
    .fn()
    .mockResolvedValue({ location: "https://pay/x", fkOrderId: 1 }),
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
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.getServerSession.mockReset().mockResolvedValue(null); // guest by default
  h.createFreekassaOrder
    .mockReset()
    .mockResolvedValue({ location: "https://pay/x", fkOrderId: 1 });
});

async function seedService(over: Partial<typeof services.$inferInsert> = {}) {
  const [s] = await db
    .insert(services)
    .values({
      slug: over.slug ?? `svc-${Math.random().toString(36).slice(2, 8)}`,
      title: "Svc",
      price: "1000.00",
      ...over,
    })
    .returning();
  return s;
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", ...headers },
    })
  );
}

const baseBody = (items: unknown[], over: Record<string, unknown> = {}) => ({
  items,
  email: "c@x.ru",
  telegram: "@c",
  adventureRank: 30,
  ...over,
});

async function orderCount() {
  return (await db.select({ id: orders.id }).from(orders)).length;
}

describe("checkout: server-side price recomputation", () => {
  it("ignores tampered item.price/total and stores the DB-derived total", async () => {
    const a = await seedService({ slug: "a", price: "1000.00" });
    const b = await seedService({ slug: "b", price: "500.50" });

    const res = await post(
      baseBody(
        [
          { id: "a", quantity: 1, price: 1, total: 1 },
          { id: "b", quantity: 1, price: 1 },
        ],
        { total: 1 }
      )
    );
    expect(res.status).toBe(200);

    const [order] = await db.select().from(orders);
    expect(order.totalPrice).toBe("1500.50"); // 1000.00 + 500.50, not the tampered 1
    expect(order.status).toBe("pending");

    // Freekassa was asked for the true amount.
    expect(h.createFreekassaOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1500.5 })
    );

    // Each line stored the DB unit price.
    const rows = await db.select().from(orderItems);
    const byService = new Map(rows.map((r) => [r.serviceId, r.priceAtPurchase]));
    expect(byService.get(a.id)).toBe("1000.00");
    expect(byService.get(b.id)).toBe("500.50");
  });

  it("sums duplicated slugs into a single line", async () => {
    await seedService({ slug: "a", price: "1000.00" });
    const res = await post(
      baseBody([
        { id: "a", quantity: 1 },
        { id: "a", quantity: 2 },
      ])
    );
    expect(res.status).toBe(200);
    const rows = await db.select().from(orderItems);
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(3);
  });
});

describe("checkout: rejection table (no order row inserted)", () => {
  const cases: { name: string; body: () => unknown; status?: number }[] = [
    { name: "unknown slug", body: () => baseBody([{ id: "nope", quantity: 1 }]) },
    { name: "quantity 0", body: () => baseBody([{ id: "a", quantity: 0 }]) },
    { name: "quantity -1", body: () => baseBody([{ id: "a", quantity: -1 }]) },
    { name: "quantity 'abc'", body: () => baseBody([{ id: "a", quantity: "abc" }]) },
    { name: "missing email", body: () => baseBody([{ id: "a", quantity: 1 }], { email: "" }) },
    { name: "adventureRank 0", body: () => baseBody([{ id: "a", quantity: 1 }], { adventureRank: 0 }) },
    { name: "adventureRank 61", body: () => baseBody([{ id: "a", quantity: 1 }], { adventureRank: 61 }) },
    { name: "adventureRank NaN", body: () => baseBody([{ id: "a", quantity: 1 }], { adventureRank: "x" }) },
    { name: "method 999", body: () => baseBody([{ id: "a", quantity: 1 }], { method: 999 }) },
  ];

  for (const c of cases) {
    it(`${c.name} → 400, no order`, async () => {
      await seedService({ slug: "a", price: "1000.00" });
      const res = await post(c.body());
      expect(res.status).toBe(400);
      expect(await orderCount()).toBe(0);
    });
  }

  it("a test service → 400, no order", async () => {
    await seedService({ slug: "a", price: "1000.00", isTestService: true });
    const res = await post(baseBody([{ id: "a", quantity: 1 }]));
    expect(res.status).toBe(400);
    expect(await orderCount()).toBe(0);
  });
});

describe("checkout: promocodes", () => {
  async function seedUserAndSession() {
    const [u] = await db
      .insert(users)
      .values({ username: "cust", email: "cust@x.ru" })
      .returning();
    h.getServerSession.mockResolvedValue({ user: { id: u.id } });
    return u;
  }

  it("applies a valid 10% code for a logged-in user with correct rounding", async () => {
    await seedUserAndSession();
    await seedService({ slug: "a", price: "1234.50" });
    await db.insert(promocodes).values({
      code: "WELC10",
      discountPercent: 10,
      expiresAt: new Date(Date.now() + 86400000),
    });
    const res = await post(baseBody([{ id: "a", quantity: 1 }], { promocode: "welc10" }));
    expect(res.status).toBe(200);
    const [order] = await db.select().from(orders);
    expect(order.totalPrice).toBe("1111.05"); // round2(1234.50 * 0.9)
    expect(order.promocode).toBe("WELC10");
  });

  it("rejects an expired code with 400 and inserts no order", async () => {
    await seedUserAndSession();
    await seedService({ slug: "a", price: "1000.00" });
    await db.insert(promocodes).values({
      code: "OLD",
      discountPercent: 50,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await post(baseBody([{ id: "a", quantity: 1 }], { promocode: "OLD" }));
    expect(res.status).toBe(400);
    expect(await orderCount()).toBe(0);
  });

  it("a GUEST with a valid code pays FULL price, promocode NULL (documented silent no-discount)", async () => {
    // guest session (default null)
    await seedService({ slug: "a", price: "1000.00" });
    await db.insert(promocodes).values({
      code: "WELC10",
      discountPercent: 10,
      expiresAt: new Date(Date.now() + 86400000),
    });
    const res = await post(baseBody([{ id: "a", quantity: 1 }], { promocode: "WELC10" }));
    expect(res.status).toBe(200);
    const [order] = await db.select().from(orders);
    expect(order.totalPrice).toBe("1000.00");
    expect(order.promocode).toBeNull();
  });
});

describe("checkout: Freekassa failure keeps the pending order", () => {
  it("returns 500 but leaves the pending order row (the abandoned-order path)", async () => {
    await seedService({ slug: "a", price: "1000.00" });
    h.createFreekassaOrder.mockRejectedValueOnce(new Error("FK down"));
    const res = await post(baseBody([{ id: "a", quantity: 1 }]));
    expect(res.status).toBe(500);
    const [order] = await db.select().from(orders);
    expect(order.status).toBe("pending");
  });
});
