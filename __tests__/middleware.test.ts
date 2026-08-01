// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Roles are EXACT-MATCH, not hierarchical: an admin hitting /portal is redirected.
// API paths get JSON 401/403; page paths get redirects with ?auth=required. §C8.
const h = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/auth/secret", () => ({ getAuthSecret: () => "test-secret" }));

import { middleware } from "@/middleware";

const req = (path: string) => new NextRequest(`http://localhost${path}`);

type Role = "user" | "admin" | "booster" | null;
function setToken(role: Role) {
  h.getToken.mockResolvedValue(role ? { role } : null);
}

beforeEach(() => h.getToken.mockReset());

describe("middleware role matrix", () => {
  const paths = {
    adminPage: "/admin/dashboard",
    adminApi: "/api/admin/orders",
    portalPage: "/portal",
    portalApi: "/api/portal/orders",
  };

  it("anonymous: API → 401 JSON, page → redirect to /?auth=required", async () => {
    setToken(null);
    const api = await middleware(req(paths.adminApi));
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: "Unauthorized" });

    const page = await middleware(req(paths.adminPage));
    expect(page.status).toBe(307);
    const loc = new URL(page.headers.get("location")!);
    expect(loc.pathname).toBe("/");
    expect(loc.searchParams.get("auth")).toBe("required");
  });

  it("wrong role: API → 403 JSON, page → plain redirect to /", async () => {
    setToken("user");
    const api = await middleware(req(paths.adminApi));
    expect(api.status).toBe(403);
    expect(await api.json()).toEqual({ error: "Forbidden" });

    const page = await middleware(req(paths.adminPage));
    expect(new URL(page.headers.get("location")!).pathname).toBe("/");
    expect(new URL(page.headers.get("location")!).searchParams.get("auth")).toBeNull();
  });

  it("an ADMIN hitting /portal is redirected (exact-match, not hierarchical)", async () => {
    setToken("admin");
    const page = await middleware(req(paths.portalPage));
    expect(page.status).toBe(307);
    const api = await middleware(req(paths.portalApi));
    expect(api.status).toBe(403);
  });

  it("the exact matching role passes through (NextResponse.next)", async () => {
    setToken("admin");
    const adminOk = await middleware(req(paths.adminPage));
    expect(adminOk.headers.get("location")).toBeNull(); // next(), no redirect
    expect(adminOk.status).toBe(200);

    setToken("booster");
    const portalOk = await middleware(req(paths.portalPage));
    expect(portalOk.status).toBe(200);
    expect(portalOk.headers.get("location")).toBeNull();
  });
});
