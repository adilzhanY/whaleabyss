// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// The header check is the ONLY auth — the body (incl. chat.id) is attacker-
// controlled. The length-equality guard before timingSafeEqual is load-bearing:
// timingSafeEqual THROWS on unequal-length buffers. See TEST_PLAN §C5.
const h = vi.hoisted(() => ({ handleUpdate: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/telegramClient", () => ({ bot: { handleUpdate: h.handleUpdate } }));

import { POST } from "@/app/api/telegram/webhook/route";

const SECRET = "s3cr3t-token";
beforeEach(() => {
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);
  h.handleUpdate.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

function post(secretHeader: string | null, body: unknown = { update_id: 1 }) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secretHeader !== null) headers["x-telegram-bot-api-secret-token"] = secretHeader;
  return POST(
    new NextRequest("http://localhost/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    })
  );
}

describe("POST /api/telegram/webhook", () => {
  it("correct header → 200 {ok:true}, handleUpdate receives the parsed body", async () => {
    const res = await post(SECRET, { update_id: 42 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(h.handleUpdate).toHaveBeenCalledWith({ update_id: 42 });
  });

  it("wrong same-length secret → 401, handleUpdate not called", async () => {
    const wrong = "x".repeat(SECRET.length);
    const res = await post(wrong);
    expect(res.status).toBe(401);
    expect(h.handleUpdate).not.toHaveBeenCalled();
  });

  it("MISSING header → 401, not 500 (exactly what breaks if the length guard is dropped)", async () => {
    const res = await post(null);
    expect(res.status).toBe(401);
    expect(h.handleUpdate).not.toHaveBeenCalled();
  });

  it("secret unset → an unheadered request still reaches handleUpdate (deliberate dev degrade)", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    const res = await post(null, { update_id: 7 });
    expect(res.status).toBe(200);
    expect(h.handleUpdate).toHaveBeenCalledWith({ update_id: 7 });
  });
});

describe("POST /api/telegram/webhook — bot not initialised", () => {
  it("bot null → 500 without throwing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/telegramClient", () => ({ bot: null }));
    const { POST: POST2 } = await import("@/app/api/telegram/webhook/route");
    const res = await POST2(
      new NextRequest("http://localhost/api/telegram/webhook", {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": SECRET },
      })
    );
    expect(res.status).toBe(500);
    vi.doUnmock("@/lib/telegramClient");
    vi.resetModules();
  });
});
