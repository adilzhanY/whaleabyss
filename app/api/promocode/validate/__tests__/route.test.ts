// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { promocodes, promocodeUsage, users } from "@/lib/schema";

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
  RATE_TIERS: { promocode: { limit: 20, windowMs: 60000 } },
}));

import { POST } from "@/app/api/promocode/validate/route";

let db: TestDb;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
  h.getServerSession.mockReset();
});

async function seedUserSession() {
  const [u] = await db.insert(users).values({ username: "c", email: "c@x.ru" }).returning();
  h.getServerSession.mockResolvedValue({ user: { id: u.id } });
  return u.id;
}
function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/promocode/validate", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    })
  );
}

describe("POST /api/promocode/validate", () => {
  it("unauthenticated → 401", async () => {
    h.getServerSession.mockResolvedValue(null);
    const res = await post({ code: "WELC10" });
    expect(res.status).toBe(401);
  });

  it("non-string code → 400", async () => {
    await seedUserSession();
    const res = await post({ code: 42 });
    expect(res.status).toBe(400);
  });

  it("unknown code → 404 (note: route uses 404 where the shared helper's other consumers use 400)", async () => {
    await seedUserSession();
    const res = await post({ code: "NOPE" });
    expect(res.status).toBe(404);
  });

  it("expired code → 400", async () => {
    await seedUserSession();
    await db.insert(promocodes).values({ code: "OLD", discountPercent: 50, expiresAt: new Date(Date.now() - 1000) });
    const res = await post({ code: "OLD" });
    expect(res.status).toBe(400);
  });

  it("already used → 400", async () => {
    const uid = await seedUserSession();
    const [p] = await db
      .insert(promocodes)
      .values({ code: "WELC10", discountPercent: 10, expiresAt: new Date(Date.now() + 86400000) })
      .returning();
    await db.insert(promocodeUsage).values({ promocodeId: p.id, userId: uid });
    const res = await post({ code: "WELC10" });
    expect(res.status).toBe(400);
  });

  it("success → { success, code, discountPercent }", async () => {
    await seedUserSession();
    await db
      .insert(promocodes)
      .values({ code: "WELC10", discountPercent: 10, expiresAt: new Date(Date.now() + 86400000) });
    const res = await post({ code: "welc10" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, code: "WELC10", discountPercent: 10 });
  });
});
