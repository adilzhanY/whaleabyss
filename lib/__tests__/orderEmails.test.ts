// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { orders, orderItems, services, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The claim-then-send asymmetries (failed send RELEASES, missing recipient KEEPS,
// never throws) are conditional UPDATE ... RETURNING predicates → PGlite.
const h = vi.hoisted(() => ({
  db: null as unknown as TestDb,
  // The real lib/email builds an SMTP transporter at import — mandatory mock.
  sendOrderPaidEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderCompletedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/lib/email", () => ({
  sendOrderPaidEmail: h.sendOrderPaidEmail,
  sendOrderCompletedEmail: h.sendOrderCompletedEmail,
}));
const { sendOrderPaidEmail, sendOrderCompletedEmail } = h;

import { claimAndSendPaidEmail, claimAndSendCompletedEmail } from "@/lib/orderEmails";

let db: TestDb;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  sendOrderPaidEmail.mockClear().mockResolvedValue(undefined);
  sendOrderCompletedEmail.mockClear().mockResolvedValue(undefined);
});

async function seedOrder(over: Partial<typeof orders.$inferInsert> = {}) {
  const [o] = await db
    .insert(orders)
    .values({ status: "paid", totalPrice: "1500.00", ...over })
    .returning();
  return o;
}
async function seedUser(over: Partial<typeof users.$inferInsert> = {}) {
  const [u] = await db
    .insert(users)
    .values({
      username: `u${Math.random().toString(36).slice(2, 8)}`,
      email: `e${Math.random().toString(36).slice(2, 8)}@x.ru`,
      ...over,
    })
    .returning();
  return u;
}
async function paidSentAt(orderId: string) {
  const [o] = await db
    .select({ t: orders.paidEmailSentAt })
    .from(orders)
    .where(eq(orders.id, orderId));
  return o.t;
}

describe("claimAndSendPaidEmail — exactly once", () => {
  it("first call sends and stamps paidEmailSentAt; second does not resend", async () => {
    const o = await seedOrder({ userNotes: "Email: g@x.ru" });
    await claimAndSendPaidEmail(o.id);
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
    expect(await paidSentAt(o.id)).not.toBeNull();

    await claimAndSendPaidEmail(o.id);
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("a failed send RELEASES the claim (back to NULL) and a later call succeeds", async () => {
    const o = await seedOrder({ userNotes: "Email: g@x.ru" });
    sendOrderPaidEmail.mockRejectedValueOnce(new Error("smtp down"));
    await claimAndSendPaidEmail(o.id);
    expect(await paidSentAt(o.id)).toBeNull(); // re-armed

    await claimAndSendPaidEmail(o.id);
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(2);
    expect(await paidSentAt(o.id)).not.toBeNull();
  });

  it("a guest with no Email line does NOT send and KEEPS the claim", async () => {
    const o = await seedOrder({ userNotes: "Telegram: @nobody" });
    await claimAndSendPaidEmail(o.id);
    expect(sendOrderPaidEmail).not.toHaveBeenCalled();
    // claim kept: a retry can't do better without a recipient.
    expect(await paidSentAt(o.id)).not.toBeNull();
  });

  it("recipientHint wins over the account's receiptEmail", async () => {
    const u = await seedUser({ receiptEmail: "account@x.ru" });
    const o = await seedOrder({ userId: u.id });
    await claimAndSendPaidEmail(o.id, { recipientHint: "payer@x.ru" });
    expect(sendOrderPaidEmail).toHaveBeenCalledWith("payer@x.ru", expect.anything());
  });

  it("parses the recipient from the userNotes Email line for a guest", async () => {
    const o = await seedOrder({ userNotes: "Email: guest@x.ru\nTelegram: @g" });
    await claimAndSendPaidEmail(o.id);
    expect(sendOrderPaidEmail).toHaveBeenCalledWith("guest@x.ru", expect.anything());
  });

  it("builds the payload: totalAmount parsed, items joined from order_items + services", async () => {
    const o = await seedOrder({ userNotes: "Email: g@x.ru", totalPrice: "2500.50" });
    const [svc] = await db
      .insert(services)
      .values({ slug: "boost", title: "Epic Boost", price: "1000.00" })
      .returning();
    await db.insert(orderItems).values({
      orderId: o.id,
      serviceId: svc.id,
      quantity: 2,
      priceAtPurchase: "1000.00",
    });
    await claimAndSendPaidEmail(o.id);
    const [, data] = sendOrderPaidEmail.mock.calls[0];
    expect(data.totalAmount).toBe(2500.5);
    expect(data.items).toEqual([{ title: "Epic Boost", quantity: 2, price: 1000 }]);
  });

  it("two concurrent claims send exactly once", async () => {
    const o = await seedOrder({ userNotes: "Email: g@x.ru" });
    await Promise.all([claimAndSendPaidEmail(o.id), claimAndSendPaidEmail(o.id)]);
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("never throws for a non-existent order", async () => {
    await expect(
      claimAndSendPaidEmail("00000000-0000-0000-0000-000000000000")
    ).resolves.toBeUndefined();
    expect(sendOrderPaidEmail).not.toHaveBeenCalled();
  });
});

describe("claimAndSendCompletedEmail — exactly once (mirror)", () => {
  it("sends once, not twice, and re-arms on failure", async () => {
    const u = await seedUser({ email: "done@x.ru" });
    const o = await seedOrder({ userId: u.id, status: "completed" });

    await claimAndSendCompletedEmail(o.id);
    expect(sendOrderCompletedEmail).toHaveBeenCalledTimes(1);

    await claimAndSendCompletedEmail(o.id);
    expect(sendOrderCompletedEmail).toHaveBeenCalledTimes(1);

    // failure path re-arms.
    const o2 = await seedOrder({ userId: u.id, status: "completed" });
    sendOrderCompletedEmail.mockRejectedValueOnce(new Error("smtp"));
    await claimAndSendCompletedEmail(o2.id);
    const [row] = await db
      .select({ t: orders.completedEmailSentAt })
      .from(orders)
      .where(eq(orders.id, o2.id));
    expect(row.t).toBeNull();
  });
});
