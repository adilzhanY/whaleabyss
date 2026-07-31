/**
 * Cart persistence rules.
 *
 * These cover the one bug this cart keeps having, in both directions: a change
 * the browser made must not be silently reverted by the server copy, and a
 * change the server has must not be silently reverted by a stale browser copy.
 *
 * The interesting sequence is a page reload, so the store module is re-imported
 * with `vi.resetModules()` — that resets its module-scope state exactly like a
 * fresh page load does, while jsdom's localStorage survives, exactly like a real
 * browser's does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CartModule = typeof import("@/store/useCart");

const ITEM = {
  id: "teni-gor",
  title: "ТЕНИ ГОР",
  subtitle: "Тени гор",
  price: 250,
};

/** Fresh module registry = fresh page. localStorage carries over, as in a browser. */
async function loadStore(): Promise<CartModule> {
  vi.resetModules();
  return import("@/store/useCart");
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (url: unknown, init?: unknown) =>
    handler(String(url), init as RequestInit),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
}

const ok = () => new Response(JSON.stringify({ success: true }), { status: 200 });
const boom = () => new Response("nope", { status: 500 });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pending-sync flag", () => {
  it("is cleared once the server confirms the write", async () => {
    mockFetch(ok);
    const { useCart, cartHasPendingSync } = await loadStore();

    useCart.getState().addToCart(ITEM);
    await useCart.getState().syncToDb();

    expect(cartHasPendingSync()).toBe(false);
  });

  it("survives the page that failed to write", async () => {
    mockFetch(boom);
    const first = await loadStore();

    first.useCart.getState().addToCart(ITEM);
    await first.useCart.getState().syncToDb();
    expect(first.cartHasPendingSync()).toBe(true);

    // Reload: module-scope state is gone, localStorage is not.
    const second = await loadStore();
    expect(second.cartHasPendingSync()).toBe(true);
  });

  it("is not cleared by a 401 leaving an unconfirmed change behind", async () => {
    // A guest has nothing to sync, so 401 means "no pending change".
    mockFetch(() => new Response("{}", { status: 401 }));
    const { useCart, cartHasPendingSync } = await loadStore();

    useCart.getState().addToCart(ITEM);
    await useCart.getState().syncToDb();

    expect(cartHasPendingSync()).toBe(false);
  });
});

describe("decideCartStartup", () => {
  it("pushes when the browser holds an unconfirmed change", async () => {
    const { decideCartStartup } = await loadStore();
    expect(decideCartStartup({ hasPendingSync: true, alreadyMerged: true })).toBe("push");
    expect(decideCartStartup({ hasPendingSync: true, alreadyMerged: false })).toBe("push");
  });

  it("merges only on the first sight of the account in this browser", async () => {
    const { decideCartStartup } = await loadStore();
    expect(decideCartStartup({ hasPendingSync: false, alreadyMerged: false })).toBe("merge");
    expect(decideCartStartup({ hasPendingSync: false, alreadyMerged: true })).toBe("load");
  });
});

describe("«удалил всё, подождал, товары вернулись»", () => {
  it("does not resurrect deleted lines after the emptying sync is lost", async () => {
    // The cart the browser starts with, and the six rows the DB still holds
    // because the delete never reached it.
    const six = Array.from({ length: 6 }, (_, i) => ({ ...ITEM, id: `quest-${i}` }));

    let syncFails = true;
    const posted: unknown[] = [];
    mockFetch((url, init) => {
      if (url.endsWith("/api/cart/sync")) {
        if (syncFails) return boom();
        posted.push(JSON.parse(String(init?.body)));
        return ok();
      }
      // The server is stale: it still has all six.
      return new Response(
        JSON.stringify({ items: six.map((i) => ({ ...i, quantity: 1 })) }),
        { status: 200 },
      );
    });

    const first = await loadStore();
    for (const item of six) first.useCart.getState().addToCart(item);
    first.useCart.getState().clearCart();
    await first.useCart.getState().syncToDb();

    expect(first.useCart.getState().items).toHaveLength(0);
    expect(first.cartHasPendingSync()).toBe(true);

    // The user comes back. Before the fix this ran loadFromDb() and the six
    // lines reappeared; now the unconfirmed local state wins and is uploaded.
    const second = await loadStore();
    syncFails = false;

    const action = second.decideCartStartup({
      hasPendingSync: second.cartHasPendingSync(),
      alreadyMerged: true,
    });
    expect(action).toBe("push");

    await second.useCart.getState().syncToDb();

    expect(second.useCart.getState().items).toHaveLength(0);
    expect(posted).toEqual([{ items: [] }]);
    expect(second.cartHasPendingSync()).toBe(false);
  });

  it("still lets the server win when the browser has nothing pending", async () => {
    mockFetch((url) =>
      url.endsWith("/api/cart/sync")
        ? ok()
        : new Response(JSON.stringify({ items: [{ ...ITEM, quantity: 2 }] }), { status: 200 }),
    );
    const { useCart, cartHasPendingSync } = await loadStore();

    expect(cartHasPendingSync()).toBe(false);
    await useCart.getState().loadFromDb();

    expect(useCart.getState().items).toEqual([expect.objectContaining({ id: ITEM.id, quantity: 2 })]);
  });
});
