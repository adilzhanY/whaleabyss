// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { orders, services, users, promocodes, promocodeUsage } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The economic contract: usage is burned by the WEBHOOK (after money moves), not
// at checkout — so a code stays valid while an order sits pending, and abandoning
// a checkout must not burn it. This spans checkout + notify on one DB. See A7.2.
const SHOP = "12345";
const S2 = "secret_two";

const h = vi.hoisted(() => ({
  db: null as unknown as TestDb,
  getServerSession: vi.fn(),
  createFreekassaOrder: vi.fn().mockResolvedValue({ location: "https://pay/x", fkOrderId: 1 }),
  notifyAdminAboutOrder: vi.fn().mockResolvedValue(undefined),
  claimAndSendPaidEmail: vi.fn().mockResolvedValue(undefined),
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
vi.mock("@/lib/telegramClient", () => ({ notifyAdminAboutOrder: h.notifyAdminAboutOrder }));
vi.mock("@/lib/orderEmails", () => ({ claimAndSendPaidEmail: h.claimAndSendPaidEmail }));

import { POST as checkout } from "@/app/api/checkout/route";
import { POST as notify } from "@/app/api/payment/freekassa/notify/route";

const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");

let db: TestDb;
let userId: string;
beforeEach(async () => {
  vi.stubEnv("FREEKASSA_SHOP_ID", SHOP);
  vi.stubEnv("FREEKASSA_SECRET_1", "s1");
  vi.stubEnv("FREEKASSA_SECRET_2", S2);
  vi.stubEnv("FREEKASSA_API_KEY", "api");
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  const [u] = await db.insert(users).values({ username: "c", email: "c@x.ru" }).returning();
  userId = u.id;
  h.getServerSession.mockResolvedValue({ user: { id: userId } });
  await db.insert(services).values({ slug: "boost", title: "Boost", price: "1000.00" });
  await db
    .insert(promocodes)
    .values({ code: "WELC10", discountPercent: 10, expiresAt: new Date(Date.now() + 86400000) });
});
afterEach(() => vi.unstubAllEnvs());

async function checkoutWithCode() {
  return checkout(
    new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: [{ id: "boost", quantity: 1 }],
        email: "c@x.ru",
        telegram: "@c",
        adventureRank: 30,
        promocode: "WELC10",
      }),
      headers: { "content-type": "application/json" },
    })
  );
}

async function payOrder(orderId: string) {
  const amount = "900.00";
  return notify(
    new NextRequest("http://localhost/api/payment/freekassa/notify", {
      method: "POST",
      body: new URLSearchParams({
        MERCHANT_ID: SHOP,
        AMOUNT: amount,
        MERCHANT_ORDER_ID: orderId,
        intid: "77",
        SIGN: md5(`${SHOP}:${amount}:${S2}:${orderId}`),
      }).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
    })
  );
}

async function usageCount() {
  return (await db.select().from(promocodeUsage)).length;
}

describe("promocode economics: valid while pending, burned only at payment", () => {
  it("(a-d) pending keeps it valid; payment burns it exactly once; then it's blocked", async () => {
    // (a) checkout with the code → pending order, ZERO usage rows.
    const r1 = await checkoutWithCode();
    expect(r1.status).toBe(200);
    const [order1] = await db.select().from(orders);
    expect(order1.totalPrice).toBe("900.00"); // 1000 * 0.9
    expect(await usageCount()).toBe(0);

    // (b) same user checks out again with the same code → still accepted, still 0 usage.
    const r2 = await checkoutWithCode();
    expect(r2.status).toBe(200);
    expect(await usageCount()).toBe(0);

    // (c) a signed webhook pays order #1 → ONE usage row.
    const pay = await payOrder(order1.id);
    expect(await pay.text()).toBe("YES");
    expect((await db.select().from(orders).where(eq(orders.id, order1.id)))[0].status).toBe("paid");
    expect(await usageCount()).toBe(1);

    // (d) a third checkout with the code → 400 «уже использовал», no new order.
    const before = (await db.select().from(orders)).length;
    const r4 = await checkoutWithCode();
    expect(r4.status).toBe(400);
    expect((await db.select().from(orders)).length).toBe(before);
  });
});
