// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchQuestAddons,
  ADDONS_BACKOFF_MS,
} from "@/lib/questAddons";

// null = "couldn't find out" → refuse the add; [] = definitive "no quests" →
// plain add. That distinction is the whole post-incident design. See TEST_PLAN §B3.
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const ok = (addons: unknown) =>
  new Response(JSON.stringify({ addons }), { status: 200 });
const status = (code: number) => new Response("", { status: code });

describe("fetchQuestAddons", () => {
  it("200 {addons:[...]} → the array on the first try, one fetch", async () => {
    fetchMock.mockResolvedValueOnce(ok([{ id: "q" }]));
    const p = fetchQuestAddons("slug");
    await vi.runAllTimersAsync();
    expect(await p).toEqual([{ id: "q" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("404 → [] immediately, no retries (definitive answer)", async () => {
    fetchMock.mockResolvedValueOnce(status(404));
    const p = fetchQuestAddons("slug");
    await vi.runAllTimersAsync();
    expect(await p).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("503 twice then 200 → succeeds on attempt 3 after the backoffs", async () => {
    fetchMock
      .mockResolvedValueOnce(status(503))
      .mockResolvedValueOnce(status(503))
      .mockResolvedValueOnce(ok([{ id: "q" }]));
    const p = fetchQuestAddons("slug");
    await vi.runAllTimersAsync();
    expect(await p).toEqual([{ id: "q" }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("three failures → null, exactly 3 fetches", async () => {
    fetchMock.mockResolvedValue(status(500));
    const p = fetchQuestAddons("slug");
    await vi.runAllTimersAsync();
    expect(await p).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(ADDONS_BACKOFF_MS.length + 1);
  });

  it("AbortError (timeout) → retried, then null", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const p = fetchQuestAddons("slug");
    await vi.runAllTimersAsync();
    expect(await p).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(ADDONS_BACKOFF_MS.length + 1);
  });

  it("200 with a non-array addons field → [] (definitive), not a crash", async () => {
    fetchMock.mockResolvedValueOnce(ok("garbage"));
    const p = fetchQuestAddons("slug");
    await vi.runAllTimersAsync();
    expect(await p).toEqual([]);
  });
});
