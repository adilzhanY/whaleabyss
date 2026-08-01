// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";

// Asserting the KEY NAME "Content-Security-Policy-Report-Only" means a premature
// flip to enforcing mode fails a test, forcing the console-clean checklist first.
// HSTS deliberately omits includeSubDomains. See TEST_PLAN §C10.
type Rule = { source: string; headers: { key: string; value: string }[] };

async function loadHeaders(nodeEnv: "production" | "development"): Promise<Rule[]> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  const mod = await import("@/next.config");
  const cfg = mod.default as { headers: () => Promise<Rule[]> };
  return cfg.headers();
}

afterEach(() => vi.unstubAllEnvs());

describe("next.config headers()", () => {
  it("applies the security headers to /:path*, and HSTS has no includeSubDomains", async () => {
    const rules = await loadHeaders("production");
    const base = rules.find((r) => r.source === "/:path*")!;
    expect(base).toBeTruthy();
    const hsts = base.headers.find((h) => h.key === "Strict-Transport-Security")!;
    expect(hsts.value).toBe("max-age=63072000");
    expect(hsts.value).not.toContain("includeSubDomains");
    expect(hsts.value).not.toContain("preload");
  });

  it("production adds exactly one Content-Security-Policy-Report-Only rule scoped to exclude banner.html", async () => {
    const rules = await loadHeaders("production");
    const cspRules = rules.filter((r) => r.headers.some((h) => h.key.startsWith("Content-Security-Policy")));
    expect(cspRules).toHaveLength(1);
    const rule = cspRules[0];
    expect(rule.source).toBe("/((?!banner.html).*)");
    // The KEY must still be Report-Only — flipping to enforce should fail here.
    expect(rule.headers[0].key).toBe("Content-Security-Policy-Report-Only");
  });

  it("the CSP value whitelists every required origin", async () => {
    const rules = await loadHeaders("production");
    const csp = rules
      .flatMap((r) => r.headers)
      .find((h) => h.key.startsWith("Content-Security-Policy"))!.value;
    expect(csp).toContain("script-src");
    expect(csp).toMatch(/script-src[^;]*mc\.yandex\.ru/);
    expect(csp).toMatch(/script-src[^;]*smartcaptcha\.cloud\.yandex\.ru/);
    expect(csp).toMatch(/connect-src[^;]*mc\.yandex\.com/);
    expect(csp).toMatch(/img-src[^;]*storage\.yandexcloud\.net/);
    expect(csp).toMatch(/img-src[^;]*avatars\.yandex\.net/);
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it("non-production → no CSP rule at all", async () => {
    const rules = await loadHeaders("development");
    const cspRules = rules.filter((r) => r.headers.some((h) => h.key.startsWith("Content-Security-Policy")));
    expect(cspRules).toHaveLength(0);
  });
});
