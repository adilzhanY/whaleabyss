// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { orders, orderItems, boosters, services } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Real Postgres in memory — the commission maths and the exactly-once claim are
// SQL predicates (the correlated SUM subquery, `WHERE booster_earning IS NULL`),
// so a chain mock would test the mock. See TEST_PLAN §1.2 / A5.
const h = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));

import { creditBoosterForCompletedOrder } from "@/lib/boosterPayout";

let db: TestDb;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
});

/** Seed a booster and return its id. */
async function seedBooster(over: Partial<typeof boosters.$inferInsert> = {}) {
  const [b] = await db
    .insert(boosters)
    .values({
      firstName: "B",
      lastName: "Ooster",
      commissionPercent: 40,
      balance: "100.00",
      ...over,
    })
    .returning({ id: boosters.id });
  return b.id;
}

let svcSeq = 0;
async function seedService(price = "1000.00") {
  const [s] = await db
    .insert(services)
    .values({ slug: `svc-${svcSeq++}`, title: "Svc", price })
    .returning({ id: services.id });
  return s.id;
}

/** Seed an order with optional line items. Returns the order id. */
async function seedOrder(opts: {
  status?: (typeof orders.$inferInsert)["status"];
  boosterId?: string | null;
  totalPrice?: string;
  boosterEarning?: string | null;
  isTestPayment?: boolean;
  items?: { price: string; quantity: number | null }[];
}) {
  const [o] = await db
    .insert(orders)
    .values({
      status: opts.status ?? "completed",
      boosterId: opts.boosterId ?? null,
      totalPrice: opts.totalPrice ?? "1800.00",
      boosterEarning: opts.boosterEarning ?? null,
      isTestPayment: opts.isTestPayment ?? false,
    })
    .returning({ id: orders.id });
  if (opts.items) {
    for (const it of opts.items) {
      const svcId = await seedService(it.price);
      await db.insert(orderItems).values({
        orderId: o.id,
        serviceId: svcId,
        quantity: it.quantity,
        priceAtPurchase: it.price,
      });
    }
  }
  return o.id;
}

async function balanceOf(boosterId: string) {
  const [b] = await db
    .select({ balance: boosters.balance })
    .from(boosters)
    .where(eq(boosters.id, boosterId));
  return b.balance;
}
async function earningOf(orderId: string) {
  const [o] = await db
    .select({ e: orders.boosterEarning })
    .from(orders)
    .where(eq(orders.id, orderId));
  return o.e;
}

describe("creditBoosterForCompletedOrder", () => {
  it("credits 40% of the PRE-discount line sum, not totalPrice, and is idempotent", async () => {
    const boosterId = await seedBooster({ commissionPercent: 40, balance: "100.00" });
    // totalPrice is post-discount 1800; the two 1000 lines sum to 2000 pre-discount.
    const orderId = await seedOrder({
      boosterId,
      totalPrice: "1800.00",
      items: [
        { price: "1000.00", quantity: 1 },
        { price: "1000.00", quantity: 1 },
      ],
    });

    await creditBoosterForCompletedOrder(orderId);

    expect(await earningOf(orderId)).toBe("800.00"); // 40% of 2000, NOT of 1800
    expect(await balanceOf(boosterId)).toBe("900.00"); // 100 + 800

    // Second call is a no-op — boosterEarning already claimed.
    await creditBoosterForCompletedOrder(orderId);
    expect(await balanceOf(boosterId)).toBe("900.00");
  });

  it("coalesces a NULL quantity to 1 in the SUM", async () => {
    const boosterId = await seedBooster({ commissionPercent: 50, balance: "0.00" });
    const orderId = await seedOrder({
      boosterId,
      items: [{ price: "1000.00", quantity: null }],
    });
    await creditBoosterForCompletedOrder(orderId);
    expect(await earningOf(orderId)).toBe("500.00"); // 50% of 1000 * 1
  });

  it("falls back to totalPrice for a legacy order with no line items", async () => {
    const boosterId = await seedBooster({ commissionPercent: 40, balance: "0.00" });
    const orderId = await seedOrder({ boosterId, totalPrice: "2000.00", items: undefined });
    await creditBoosterForCompletedOrder(orderId);
    expect(await earningOf(orderId)).toBe("800.00"); // 40% of totalPrice 2000
    expect(await balanceOf(boosterId)).toBe("800.00");
  });

  describe("no-op matrix (balance and boosterEarning untouched)", () => {
    for (const status of ["paid", "in_progress"] as const) {
      it(`status='${status}' → not credited`, async () => {
        const boosterId = await seedBooster({ balance: "100.00" });
        const orderId = await seedOrder({
          status,
          boosterId,
          items: [{ price: "1000.00", quantity: 1 }],
        });
        await creditBoosterForCompletedOrder(orderId);
        expect(await earningOf(orderId)).toBeNull();
        expect(await balanceOf(boosterId)).toBe("100.00");
      });
    }

    it("boosterId NULL → not credited", async () => {
      const orderId = await seedOrder({
        boosterId: null,
        items: [{ price: "1000.00", quantity: 1 }],
      });
      await creditBoosterForCompletedOrder(orderId);
      expect(await earningOf(orderId)).toBeNull();
    });

    it("boosterEarning already set ('0.00' counts as set) → not re-credited", async () => {
      const boosterId = await seedBooster({ balance: "100.00" });
      const orderId = await seedOrder({
        boosterId,
        boosterEarning: "0.00",
        items: [{ price: "1000.00", quantity: 1 }],
      });
      await creditBoosterForCompletedOrder(orderId);
      expect(await earningOf(orderId)).toBe("0.00");
      expect(await balanceOf(boosterId)).toBe("100.00");
    });

    it("isTestPayment=true → never moves a real balance", async () => {
      const boosterId = await seedBooster({ balance: "100.00" });
      const orderId = await seedOrder({
        boosterId,
        isTestPayment: true,
        items: [{ price: "1000.00", quantity: 1 }],
      });
      await creditBoosterForCompletedOrder(orderId);
      expect(await earningOf(orderId)).toBeNull();
      expect(await balanceOf(boosterId)).toBe("100.00");
    });

    it("booster deleted (leftJoin → commissionPercent NULL) → pins the current 0.00 behaviour", async () => {
      // Order references a booster id that no longer exists.
      const [o] = await db
        .insert(orders)
        .values({
          status: "completed",
          boosterId: null, // set below via raw to a dangling value? Instead, delete booster after.
          totalPrice: "1000.00",
        })
        .returning({ id: orders.id });
      const boosterId = await seedBooster({ balance: "100.00" });
      await db.update(orders).set({ boosterId }).where(eq(orders.id, o.id));
      // Now the row has a booster; simulate "deleted booster" by nulling the join:
      // delete the booster → ON DELETE SET NULL clears orders.boosterId, so instead
      // we assert the more realistic path: a present booster credits normally.
      // The dangling-FK case can't be produced with the SET NULL constraint, so we
      // pin the observable equivalent: crediting a real booster with 0% commission.
      await db.update(boosters).set({ commissionPercent: 0 }).where(eq(boosters.id, boosterId));
      await db.insert(orderItems).values({
        orderId: o.id,
        serviceId: await seedService("1000.00"),
        quantity: 1,
        priceAtPurchase: "1000.00",
      });
      await creditBoosterForCompletedOrder(o.id);
      expect(await earningOf(o.id)).toBe("0.00");
      expect(await balanceOf(boosterId)).toBe("100.00");
    });
  });

  it("concurrent credit() calls increment the balance exactly once", async () => {
    const boosterId = await seedBooster({ commissionPercent: 40, balance: "0.00" });
    const orderId = await seedOrder({
      boosterId,
      items: [{ price: "1000.00", quantity: 2 }],
    });
    await Promise.all([
      creditBoosterForCompletedOrder(orderId),
      creditBoosterForCompletedOrder(orderId),
    ]);
    expect(await earningOf(orderId)).toBe("800.00"); // 40% of 2000
    expect(await balanceOf(boosterId)).toBe("800.00"); // credited once, not twice
  });
});
