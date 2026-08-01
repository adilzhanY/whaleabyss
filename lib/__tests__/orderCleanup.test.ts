// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The delete predicate hinges on `updatedAt` being older than one day, and that
// gap IS Freekassa's 24h retry window — deleting on `createdAt` instead would
// destroy a slow-paying customer's order. Real SQL is the only honest test.
// See TEST_PLAN §A6.
const h = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));

import {
  cancelStalePendingOrders,
  deleteOldNeverPaidCancelledOrders,
  runOrderCleanup,
} from "@/lib/orderCleanup";

let db: TestDb;
let client: PGlite;
beforeEach(async () => {
  ({ db: h.db, client } = await makeTestDb());
  db = h.db;
});

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);

async function seed(row: {
  status: (typeof orders.$inferInsert)["status"];
  paymentId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  const [o] = await db
    .insert(orders)
    .values({
      status: row.status,
      totalPrice: "1000.00",
      paymentId: row.paymentId ?? null,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
    })
    .returning({ id: orders.id });
  return o.id;
}

async function statusOf(id: string) {
  const rows = await db.select({ s: orders.status }).from(orders).where(eq(orders.id, id));
  return rows[0]?.s ?? null; // null = deleted
}

describe("cancelStalePendingOrders", () => {
  it("cancels pending older than 1h, leaves fresher pending alone", async () => {
    const stale = await seed({ status: "pending", createdAt: ago(61 * 60 * 1000) });
    const fresh = await seed({ status: "pending", createdAt: ago(59 * 60 * 1000) });
    const n = await cancelStalePendingOrders();
    expect(n).toBe(1);
    expect(await statusOf(stale)).toBe("cancelled");
    expect(await statusOf(fresh)).toBe("pending");
  });

  it("never touches paid/completed however old", async () => {
    const paid = await seed({ status: "paid", createdAt: ago(10 * DAY) });
    const done = await seed({ status: "completed", createdAt: ago(10 * DAY) });
    await cancelStalePendingOrders();
    expect(await statusOf(paid)).toBe("paid");
    expect(await statusOf(done)).toBe("completed");
  });
});

describe("deleteOldNeverPaidCancelledOrders", () => {
  it("deletes cancelled + null paymentId + >1 day, keeps the 23h one", async () => {
    const old = await seed({ status: "cancelled", paymentId: null, updatedAt: ago(25 * HOUR) });
    const recent = await seed({ status: "cancelled", paymentId: null, updatedAt: ago(23 * HOUR) });
    const n = await deleteOldNeverPaidCancelledOrders();
    expect(n).toBe(1);
    expect(await statusOf(old)).toBeNull();
    expect(await statusOf(recent)).toBe("cancelled");
  });

  it("never deletes a cancelled order that carries a paymentId (paid then admin-cancelled)", async () => {
    const paidThenCancelled = await seed({
      status: "cancelled",
      paymentId: "12345",
      updatedAt: ago(10 * DAY),
    });
    const n = await deleteOldNeverPaidCancelledOrders();
    expect(n).toBe(0);
    expect(await statusOf(paidThenCancelled)).toBe("cancelled");
  });

  it("never deletes TEST/MANUAL sentinels", async () => {
    const test = await seed({ status: "cancelled", paymentId: "TEST", updatedAt: ago(10 * DAY) });
    const manual = await seed({ status: "cancelled", paymentId: "MANUAL", updatedAt: ago(10 * DAY) });
    await deleteOldNeverPaidCancelledOrders();
    expect(await statusOf(test)).toBe("cancelled");
    expect(await statusOf(manual)).toBe("cancelled");
  });
});

describe("runOrderCleanup sequencing (the whole 24h buffer)", () => {
  it("cancels a 2h-old pending but does NOT delete it in the same run", async () => {
    // updatedAt is refreshed to now on cancel, so the delete predicate can't match.
    const id = await seed({ status: "pending", createdAt: ago(2 * HOUR), updatedAt: ago(2 * HOUR) });
    const { cancelled, deleted } = await runOrderCleanup();
    expect(cancelled).toBe(1);
    expect(deleted).toBe(0);
    expect(await statusOf(id)).toBe("cancelled");
  });
});

describe("contract: cleanup_stale_orders.mjs raw SQL matches the drizzle predicates", () => {
  it("the script's two queries leave the same rows surviving as the lib functions", async () => {
    // Pull the two SQL strings straight out of the script so this test fails
    // loudly if someone edits a predicate there without touching lib/orderCleanup.
    const src = readFileSync(
      path.resolve(__dirname, "../../cleanup_stale_orders.mjs"),
      "utf8"
    );
    const queries = [...src.matchAll(/client\.query\(`([\s\S]*?)`\)/g)].map((m) => m[1]);
    expect(queries).toHaveLength(2);
    const [cancelSql, deleteSql] = queries;

    // Seed one of every relevant shape.
    const shapes = {
      stalePending: await seed({ status: "pending", createdAt: ago(2 * HOUR), updatedAt: ago(2 * HOUR) }),
      freshPending: await seed({ status: "pending", createdAt: ago(30 * 60 * 1000) }),
      oldCancelledUnpaid: await seed({ status: "cancelled", paymentId: null, updatedAt: ago(2 * DAY) }),
      recentCancelledUnpaid: await seed({ status: "cancelled", paymentId: null, updatedAt: ago(2 * HOUR) }),
      cancelledPaid: await seed({ status: "cancelled", paymentId: "9", updatedAt: ago(2 * DAY) }),
      paid: await seed({ status: "paid", createdAt: ago(2 * DAY) }),
    };

    await client.query(cancelSql);
    await client.query(deleteSql);

    const survivors = new Set((await db.select({ id: orders.id }).from(orders)).map((r) => r.id));

    // oldCancelledUnpaid gone; everything else present. stalePending is cancelled
    // in step 1 → its updatedAt is NOW() so step 2 can't delete it.
    expect(survivors.has(shapes.oldCancelledUnpaid)).toBe(false);
    expect(survivors.has(shapes.stalePending)).toBe(true);
    expect(survivors.has(shapes.freshPending)).toBe(true);
    expect(survivors.has(shapes.recentCancelledUnpaid)).toBe(true);
    expect(survivors.has(shapes.cancelledPaid)).toBe(true);
    expect(survivors.has(shapes.paid)).toBe(true);
  });
});
