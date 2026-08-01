// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { promocodes, promocodeUsage, users } from "@/lib/schema";

const h = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));

import { validatePromocodeForUser } from "@/lib/promocodeValidation";

let db: TestDb;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
});

async function seedUser() {
  const [u] = await db
    .insert(users)
    .values({ username: `u${Math.random().toString(36).slice(2, 7)}`, email: `${Math.random()}@x.ru` })
    .returning();
  return u.id;
}
async function seedPromo(over: Partial<typeof promocodes.$inferInsert> = {}) {
  const [p] = await db
    .insert(promocodes)
    .values({
      code: "WELC10",
      discountPercent: 10,
      expiresAt: new Date(Date.now() + 86400000),
      ...over,
    })
    .returning();
  return p;
}

describe("validatePromocodeForUser", () => {
  it("unknown code → not found", async () => {
    const r = await validatePromocodeForUser("NOPE", await seedUser());
    expect(r).toEqual({ ok: false, error: "Промокод не найден" });
  });

  it("expired code → истёк", async () => {
    await seedPromo({ code: "OLD", expiresAt: new Date(Date.now() - 1000) });
    const r = await validatePromocodeForUser("OLD", await seedUser());
    expect(r).toEqual({ ok: false, error: "Промокод истёк" });
  });

  it("this user already used it → blocked", async () => {
    const uid = await seedUser();
    const p = await seedPromo();
    await db.insert(promocodeUsage).values({ promocodeId: p.id, userId: uid });
    const r = await validatePromocodeForUser("WELC10", uid);
    expect(r).toEqual({ ok: false, error: "Клиент уже использовал этот промокод" });
  });

  it("ANOTHER user's usage does not block this user", async () => {
    const other = await seedUser();
    const me = await seedUser();
    const p = await seedPromo();
    await db.insert(promocodeUsage).values({ promocodeId: p.id, userId: other });
    const r = await validatePromocodeForUser("WELC10", me);
    expect(r.ok).toBe(true);
  });

  it("normalises '  welc10 ' → 'WELC10' and returns the row verbatim", async () => {
    const uid = await seedUser();
    const p = await seedPromo();
    const r = await validatePromocodeForUser("  welc10 ", uid);
    expect(r).toEqual({ ok: true, code: "WELC10", discountPercent: 10, promocodeId: p.id });
  });
});
