// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDbStub, type DbStub } from "@/test/utils/dbStub";

// The token is a CACHE of the users row: role/username/avatar re-read every
// request (only when `user` is absent), and the client update() override applied
// AFTER the read so it wins. Getting the order or the `if (user)` guard wrong
// resurrects the stale-avatar bug or lets a demoted admin keep role:'admin'. §C2.
const h = vi.hoisted(() => ({ stub: null as unknown as DbStub }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.stub.db;
  },
}));
vi.mock("bcrypt", () => ({ default: { compare: vi.fn() }, compare: vi.fn() }));
vi.mock("@/lib/oauthUser", () => ({ getOrCreateUserFromYandex: vi.fn() }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jwt: (args: any) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sessionCb: (args: any) => Promise<any>;

beforeEach(async () => {
  h.stub = makeDbStub();
  const route = await import("@/app/api/auth/[...nextauth]/route");
  jwt = route.authOptions.callbacks!.jwt as typeof jwt;
  sessionCb = route.authOptions.callbacks!.session as typeof sessionCb;
});

describe("jwt callback", () => {
  it("initial sign-in (user present) sets fields and does NOT read the DB", async () => {
    const token = await jwt({
      token: {},
      user: { id: "u1", name: "Neo", image: "a.png", role: "admin" },
    });
    expect(token).toMatchObject({ id: "u1", name: "Neo", image: "a.png", role: "admin" });
    expect(h.stub.selectCount()).toBe(0);
  });

  it("SECURITY: a refresh re-reads the row and demotes a stale admin token to 'user'", async () => {
    h.stub.queueRows([{ role: "user", username: "neo", avatarUrl: "new.png" }]);
    const token = await jwt({ token: { id: "u1", role: "admin", name: "old", image: "old.png" } });
    expect(token.role).toBe("user");
    expect(token.name).toBe("neo");
    expect(token.image).toBe("new.png");
  });

  it("a deleted user (DB returns []) keeps the token's prior values", async () => {
    h.stub.queueRows([]); // no row
    const token = await jwt({ token: { id: "u1", role: "admin", name: "old", image: "old.png" } });
    expect(token.role).toBe("admin");
    expect(token.name).toBe("old");
    expect(token.image).toBe("old.png");
  });

  it("trigger 'update' wins over the row just read (override-last, field-scoped)", async () => {
    h.stub.queueRows([{ role: "user", username: "fromdb", avatarUrl: "old.png" }]);
    const token = await jwt({
      token: { id: "u1", role: "user" },
      trigger: "update",
      session: { image: "new.png" },
    });
    expect(token.image).toBe("new.png"); // optimistic client value wins
    expect(token.name).toBe("fromdb"); // name not in session → stays the DB value
  });
});

describe("session callback", () => {
  it("maps token fields onto session.user and defaults role to 'user'", async () => {
    const s = await sessionCb({
      session: { user: {} },
      token: { id: "u1", name: "Neo", image: "a.png" }, // no role
    });
    expect(s.user).toMatchObject({ id: "u1", name: "Neo", image: "a.png", role: "user" });
  });
});
