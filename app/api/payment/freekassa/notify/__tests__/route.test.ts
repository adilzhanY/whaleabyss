// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import {
  orders,
  services,
  users,
  cartItems,
  promocodes,
  promocodeUsage,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

// The paid transition eligibility lives INSIDE the UPDATE's WHERE (pending OR
// cancelled&&paymentId IS NULL). FK retries aggressively, so duplicate delivery
// and late-reopen are SQL-predicate behaviour → PGlite, not a chain mock. A2/A3.
const SHOP = "12345";
const S1 = "secret_one";
const S2 = "secret_two";

const h = vi.hoisted(() => ({
  db: null as unknown as TestDb,
  notifyAdminAboutOrder: vi.fn().mockResolvedValue(undefined),
  claimAndSendPaidEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/lib/telegramClient", () => ({
  notifyAdminAboutOrder: h.notifyAdminAboutOrder,
}));
vi.mock("@/lib/orderEmails", () => ({
  claimAndSendPaidEmail: h.claimAndSendPaidEmail,
}));

import { POST, GET } from "@/app/api/payment/freekassa/notify/route";

const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");
const sign = (amount: string, orderId: string) => md5(`${SHOP}:${amount}:${S2}:${orderId}`);

let db: TestDb;
beforeEach(async () => {
  vi.stubEnv("FREEKASSA_SHOP_ID", SHOP);
  vi.stubEnv("FREEKASSA_SECRET_1", S1);
  vi.stubEnv("FREEKASSA_SECRET_2", S2);
  vi.stubEnv("FREEKASSA_API_KEY", "api");
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.notifyAdminAboutOrder.mockClear();
  h.claimAndSendPaidEmail.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

async function seedOrder(over: Partial<typeof orders.$inferInsert> = {}) {
  const [o] = await db
    .insert(orders)
    .values({ status: "pending", totalPrice: "1500.00", ...over })
    .returning();
  return o;
}

/** Build a form-urlencoded notify request with the given fields. */
function notify(
  fields: Record<string, string>,
  opts: { method?: "POST" | "GET"; headers?: Record<string, string> } = {}
) {
  const method = opts.method ?? "POST";
  if (method === "GET") {
    const url = new URL("http://localhost/api/payment/freekassa/notify");
    for (const [k, v] of Object.entries(fields)) url.searchParams.set(k, v);
    return GET(new NextRequest(url, { method: "GET", headers: opts.headers }));
  }
  return POST(
    new NextRequest("http://localhost/api/payment/freekassa/notify", {
      method: "POST",
      body: new URLSearchParams(fields).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded", ...opts.headers },
    })
  );
}

/** A fully valid, correctly-signed notification for `order`. */
function validFields(order: { id: string; totalPrice: string }, over: Record<string, string> = {}) {
  const amount = over.AMOUNT ?? order.totalPrice;
  return {
    MERCHANT_ID: SHOP,
    AMOUNT: amount,
    MERCHANT_ORDER_ID: order.id,
    intid: "999",
    P_EMAIL: "payer@x.ru",
    SIGN: sign(amount, order.id),
    ...over,
  };
}

async function statusOf(id: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, id));
  return o;
}

describe("A3: atomic claim, duplicate delivery, late reopen", () => {
  it("happy path: 'YES', status→paid, paymentId=intid, notify once, email once with P_EMAIL, cart cleared", async () => {
    const [u] = await db.insert(users).values({ username: "c", email: "c@x.ru" }).returning();
    const svc = (await db.insert(services).values({ slug: "s", title: "S", price: "1500.00" }).returning())[0];
    const o = await seedOrder({ userId: u.id });
    await db.insert(cartItems).values({ userId: u.id, serviceId: svc.id, quantity: 1 });

    const res = await notify(validFields(o));
    expect(await res.text()).toBe("YES");

    const row = await statusOf(o.id);
    expect(row.status).toBe("paid");
    expect(row.paymentId).toBe("999");

    expect(h.notifyAdminAboutOrder).toHaveBeenCalledTimes(1);
    expect(h.claimAndSendPaidEmail).toHaveBeenCalledTimes(1);
    expect(h.claimAndSendPaidEmail).toHaveBeenCalledWith(o.id, { recipientHint: "payer@x.ru" });

    const carts = await db.select().from(cartItems).where(eq(cartItems.userId, u.id));
    expect(carts).toHaveLength(0);
  });

  it("duplicate delivery: telegram once, response still 'YES', but paid-email retried", async () => {
    const o = await seedOrder({ userNotes: "Email: g@x.ru" });
    await notify(validFields(o));
    await notify(validFields(o));
    expect(h.notifyAdminAboutOrder).toHaveBeenCalledTimes(1); // fulfilment ran once
    // The loser delivery re-attempts the paid email deliberately (retry-as-email-retry).
    expect(h.claimAndSendPaidEmail).toHaveBeenCalledTimes(2);
  });

  it("a refunded order → 'YES' and claimAndSendPaidEmail NOT called", async () => {
    const o = await seedOrder({ status: "refunded", paymentId: "abc" });
    const res = await notify(validFields(o));
    expect(await res.text()).toBe("YES");
    expect(h.claimAndSendPaidEmail).not.toHaveBeenCalled();
  });

  it("late reopen: cancelled + null paymentId → flips to paid with full fulfilment", async () => {
    const o = await seedOrder({ status: "cancelled", paymentId: null, userNotes: "Email: g@x.ru" });
    const res = await notify(validFields(o));
    expect(await res.text()).toBe("YES");
    expect((await statusOf(o.id)).status).toBe("paid");
    expect(h.notifyAdminAboutOrder).toHaveBeenCalledTimes(1);
  });

  it("cancelled + paymentId set (admin-cancelled after payment) → 'YES', stays cancelled, zero fulfilment", async () => {
    const o = await seedOrder({ status: "cancelled", paymentId: "12345" });
    const res = await notify(validFields(o));
    expect(await res.text()).toBe("YES");
    expect((await statusOf(o.id)).status).toBe("cancelled");
    expect(h.notifyAdminAboutOrder).not.toHaveBeenCalled();
    expect(h.claimAndSendPaidEmail).not.toHaveBeenCalled();
  });

  it("regression pin: missing intid on a pending order → paid with paymentId NULL", async () => {
    const o = await seedOrder();
    // hard-deletable by cleanup + re-openable by a stale retry — see TEST_BEFORE_MERGE §7.
    const fields = validFields(o);
    delete (fields as Record<string, string>).intid;
    const res = await notify(fields);
    expect(await res.text()).toBe("YES");
    const row = await statusOf(o.id);
    expect(row.status).toBe("paid");
    expect(row.paymentId).toBeNull();
  });

  it("promocode usage recorded exactly once, on the claiming delivery only", async () => {
    const [u] = await db.insert(users).values({ username: "p", email: "p@x.ru" }).returning();
    const [promo] = await db
      .insert(promocodes)
      .values({ code: "WELC10", discountPercent: 10, expiresAt: new Date(Date.now() + 86400000) })
      .returning();
    const o = await seedOrder({ userId: u.id, promocode: "WELC10" });

    await notify(validFields(o));
    await notify(validFields(o)); // duplicate must not add a second usage

    const usage = await db.select().from(promocodeUsage).where(eq(promocodeUsage.promocodeId, promo.id));
    expect(usage).toHaveLength(1);
    expect(usage[0].userId).toBe(u.id);
    expect(usage[0].orderId).toBe(o.id);
  });

  it("guest order (userId NULL) with a promocode → zero usage rows, no crash", async () => {
    await db
      .insert(promocodes)
      .values({ code: "WELC10", discountPercent: 10, expiresAt: new Date(Date.now() + 86400000) });
    const o = await seedOrder({ userId: null, promocode: "WELC10", userNotes: "Email: g@x.ru" });
    const res = await notify(validFields(o));
    expect(await res.text()).toBe("YES");
    expect(await db.select().from(promocodeUsage)).toHaveLength(0);
  });
});

describe("A2: notify-handler signature & amount rejects", () => {
  it("garbage SIGN → 400, order still pending", async () => {
    const o = await seedOrder();
    const res = await notify({ ...validFields(o), SIGN: "deadbeef" });
    expect(res.status).toBe(400);
    expect((await statusOf(o.id)).status).toBe("pending");
  });

  it("correctly signed but AMOUNT != totalPrice → 400, still pending (can't underpay)", async () => {
    const o = await seedOrder({ totalPrice: "1500.00" });
    // sign the wrong amount correctly — the amount check is separate from the signature.
    const res = await notify(validFields(o, { AMOUNT: "1000.00" }));
    expect(res.status).toBe(400);
    expect((await statusOf(o.id)).status).toBe("pending");
  });

  it("AMOUNT '1500' vs totalPrice '1500.00' → processed (parseFloat compare)", async () => {
    const o = await seedOrder({ totalPrice: "1500.00", userNotes: "Email: g@x.ru" });
    const res = await notify(validFields(o, { AMOUNT: "1500" }));
    expect(await res.text()).toBe("YES");
    expect((await statusOf(o.id)).status).toBe("paid");
  });

  it("missing SIGN → 400", async () => {
    const o = await seedOrder();
    const fields = validFields(o);
    delete (fields as Record<string, string>).SIGN;
    const res = await notify(fields);
    expect(res.status).toBe(400);
  });

  it("unknown MERCHANT_ORDER_ID → 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await notify({
      MERCHANT_ID: SHOP,
      AMOUNT: "1500.00",
      MERCHANT_ORDER_ID: fakeId,
      SIGN: sign("1500.00", fakeId),
    });
    expect(res.status).toBe(404);
  });

  it("params merged from the query string on a POST are honoured (verification runs)", async () => {
    // The handler merges req.nextUrl.searchParams into `data` after the body.
    // Prove that path works: send SIGN via the query string, the rest in the body.
    const o = await seedOrder({ userNotes: "Email: g@x.ru" });
    const f = validFields(o);
    const bodyFields = { ...f };
    delete (bodyFields as Record<string, string>).SIGN;
    const res = await POST(
      new NextRequest(
        `http://localhost/api/payment/freekassa/notify?SIGN=${f.SIGN}`,
        {
          method: "POST",
          body: new URLSearchParams(bodyFields).toString(),
          headers: { "content-type": "application/x-www-form-urlencoded" },
        }
      )
    );
    expect(await res.text()).toBe("YES");
    expect((await statusOf(o.id)).status).toBe("paid");
  });

  it("KNOWN QUIRK: a bodyless GET probe 500s — formData() is called unconditionally and undici throws on an empty body, so the query-string merge is unreachable on GET", async () => {
    // Pinning current behavior, not endorsing it. See notify/route.ts:68 — the
    // `else { await req.formData() }` branch runs for GET too and throws before
    // the searchParams merge. A real FK GET connectivity probe gets a 500 (which
    // still proves reachability, so it has caused no incident) but the documented
    // "GET query-string params" support does not actually work. TEST_BEFORE_MERGE §7.
    const o = await seedOrder();
    const res = await notify(validFields(o), { method: "GET" });
    expect(res.status).toBe(500);
  });
});

describe("A2: FREEKASSA_CHECK_IP allow-list", () => {
  beforeEach(() => vi.stubEnv("FREEKASSA_CHECK_IP", "true"));

  it("an untrusted IP → 403 before any parsing", async () => {
    const o = await seedOrder();
    const res = await notify(validFields(o), { headers: { "x-forwarded-for": "1.2.3.4" } });
    expect(res.status).toBe(403);
    expect((await statusOf(o.id)).status).toBe("pending");
  });

  it("an allow-listed IP → proceeds", async () => {
    const o = await seedOrder({ userNotes: "Email: g@x.ru" });
    const res = await notify(validFields(o), { headers: { "x-forwarded-for": "168.119.157.136" } });
    expect(await res.text()).toBe("YES");
  });

  it("allow-listed entry not leftmost ('spoofed, <allowed>') → 403 (leftmost is trusted)", async () => {
    const o = await seedOrder();
    const res = await notify(validFields(o), {
      headers: { "x-forwarded-for": "9.9.9.9, 168.119.157.136" },
    });
    expect(res.status).toBe(403);
  });
});
