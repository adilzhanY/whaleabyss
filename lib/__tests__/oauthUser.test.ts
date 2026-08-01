// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeTestDb, type TestDb } from "@/test/utils/pgliteDb";
import { users, oauthAccounts } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The three-way resolution (oauth match → link by verified email → create)
// decides whether a returning customer keeps their history or gets a duplicate.
// Created users must have NULL passwordHash; backfill must not clobber a
// user-chosen username. See TEST_PLAN §C6.
const h = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));

import { getOrCreateUserFromYandex, yandexAvatarUrl } from "@/lib/oauthUser";

let db: TestDb;
beforeEach(async () => {
  ({ db: h.db } = await makeTestDb());
  db = h.db;
});

async function userCount() {
  return (await db.select().from(users)).length;
}

describe("yandexAvatarUrl", () => {
  it("islands-200 URL when an avatar id is present", () => {
    expect(yandexAvatarUrl({ id: "y", default_avatar_id: "abc" })).toBe(
      "https://avatars.yandex.net/get-yapic/abc/islands-200"
    );
  });
  it("null when is_avatar_empty", () => {
    expect(yandexAvatarUrl({ id: "y", default_avatar_id: "abc", is_avatar_empty: true })).toBeNull();
  });
  it("null when no avatar id", () => {
    expect(yandexAvatarUrl({ id: "y" })).toBeNull();
  });
});

describe("getOrCreateUserFromYandex", () => {
  it("no email at all → null, zero db calls", async () => {
    const spy = vi.spyOn(h.db, "select");
    expect(await getOrCreateUserFromYandex({ id: "y1" })).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("an existing oauth link → returns that user, inserts no new user", async () => {
    const [u] = await db.insert(users).values({ username: "existing", email: "e@x.ru" }).returning();
    await db.insert(oauthAccounts).values({ userId: u.id, provider: "yandex", providerAccountId: "y1" });
    const result = await getOrCreateUserFromYandex({ id: "y1", default_email: "e@x.ru" });
    expect(result?.id).toBe(u.id);
    expect(await userCount()).toBe(1);
  });

  it("no link but a same-email user → links it, no new user, passwordHash untouched", async () => {
    const [u] = await db
      .insert(users)
      .values({ username: "acct", email: "same@x.ru", passwordHash: "keepme" })
      .returning();
    const result = await getOrCreateUserFromYandex({ id: "y2", default_email: "same@x.ru" });
    expect(result?.id).toBe(u.id);
    expect(await userCount()).toBe(1);
    const links = await db.select().from(oauthAccounts).where(eq(oauthAccounts.providerAccountId, "y2"));
    expect(links).toHaveLength(1);
    expect(links[0].userId).toBe(u.id);
    const [after] = await db.select().from(users).where(eq(users.id, u.id));
    expect(after.passwordHash).toBe("keepme");
  });

  it("a fresh profile → new user with NULL passwordHash and the profile avatar", async () => {
    const result = await getOrCreateUserFromYandex({
      id: "y3",
      default_email: "new@x.ru",
      first_name: "Bob",
      default_avatar_id: "av1",
    });
    expect(result?.passwordHash).toBeNull();
    expect(result?.avatarUrl).toBe("https://avatars.yandex.net/get-yapic/av1/islands-200");
    expect(result?.email).toBe("new@x.ru");
  });

  it("backfill renames a technical uid-* username but leaves a user-chosen one alone", async () => {
    const [tech] = await db.insert(users).values({ username: "uid-12345", email: "t@x.ru" }).returning();
    await db.insert(oauthAccounts).values({ userId: tech.id, provider: "yandex", providerAccountId: "y4" });
    const renamed = await getOrCreateUserFromYandex({ id: "y4", default_email: "t@x.ru", first_name: "Bobby" });
    expect(renamed?.username).toBe("Bobby");

    const [chosen] = await db.insert(users).values({ username: "RealName", email: "r@x.ru" }).returning();
    await db.insert(oauthAccounts).values({ userId: chosen.id, provider: "yandex", providerAccountId: "y5" });
    const kept = await getOrCreateUserFromYandex({ id: "y5", default_email: "r@x.ru", first_name: "Whatever" });
    expect(kept?.username).toBe("RealName"); // untouched
  });
});
