// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifySmartCaptcha } from "@/lib/smartcaptcha";

// Fail-closed is the load-bearing property: a well-meaning "don't block users
// when Yandex is down" edit flips it to fail-OPEN, and this is the only tripwire.
// See TEST_PLAN §C3.
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verifySmartCaptcha", () => {
  it("no server key → true WITHOUT calling fetch (dev skip)", async () => {
    vi.stubEnv("YANDEX_SMARTCAPTCHA_SERVER_KEY", "");
    expect(await verifySmartCaptcha("tok")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("key set + empty token → false, no fetch", async () => {
    vi.stubEnv("YANDEX_SMARTCAPTCHA_SERVER_KEY", "secret");
    expect(await verifySmartCaptcha("")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("{status:'ok'} → true, and the POST body carries secret+token+ip", async () => {
    vi.stubEnv("YANDEX_SMARTCAPTCHA_SERVER_KEY", "secret");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    expect(await verifySmartCaptcha("tok", "1.2.3.4")).toBe(true);
    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as URLSearchParams;
    expect(body.get("secret")).toBe("secret");
    expect(body.get("token")).toBe("tok");
    expect(body.get("ip")).toBe("1.2.3.4");
  });

  it("status 'failed' → false", async () => {
    vi.stubEnv("YANDEX_SMARTCAPTCHA_SERVER_KEY", "secret");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "failed" }), { status: 200 }));
    expect(await verifySmartCaptcha("tok")).toBe(false);
  });

  it("HTTP error from the validate endpoint → false", async () => {
    vi.stubEnv("YANDEX_SMARTCAPTCHA_SERVER_KEY", "secret");
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));
    expect(await verifySmartCaptcha("tok")).toBe(false);
  });

  it("fetch rejects (network/timeout) → false (FAIL CLOSED)", async () => {
    vi.stubEnv("YANDEX_SMARTCAPTCHA_SERVER_KEY", "secret");
    fetchMock.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    expect(await verifySmartCaptcha("tok")).toBe(false);
  });
});
