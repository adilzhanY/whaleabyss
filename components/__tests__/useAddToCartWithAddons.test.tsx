import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { useAddToCartWithAddons } from "@/components/QuestAddonModal";
import { useCart } from "@/store/useCart";
import { useAddonPrompt } from "@/store/useAddonPrompt";
import { useAddonError } from "@/store/useAddonError";

// The hook is an ADD-TIME gate: null → refuse (AddonUnavailableModal), [] →
// plain add, non-empty → open the modal, flag false → no fetch. The null-vs-[]
// behaviour of fetchQuestAddons itself is B3; here we mock it to test the hook's
// decision. See TEST_PLAN §B5.
const h = vi.hoisted(() => ({ fetchQuestAddons: vi.fn() }));
vi.mock("@/lib/questAddons", () => ({
  fetchQuestAddons: h.fetchQuestAddons,
  fetchWithTimeout: vi.fn(),
  PROFILE_TIMEOUT_MS: 4000,
}));

const item = { id: "exploration", title: "Map", subtitle: "Map cleaning", price: 1000 };

function Harness({ hasQuest = true }: { hasQuest?: boolean }) {
  const { add, pending } = useAddToCartWithAddons();
  return (
    <button data-pending={pending} onClick={() => add(item, 1, null, hasQuest)}>
      add
    </button>
  );
}

beforeEach(() => {
  useCart.setState({ items: [], isOpen: false });
  useAddonPrompt.setState({ isOpen: false, parent: null, addons: [], parentQuantity: 1, mode: "add" });
  useAddonError.setState({ isOpen: false, serviceName: null, retry: null });
  h.fetchQuestAddons.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
});
afterEach(cleanup);

describe("useAddToCartWithAddons", () => {
  it("addons null → cart unchanged, AddonError open with a working retry", async () => {
    h.fetchQuestAddons.mockResolvedValue(null);
    render(<Harness />);
    fireEvent.click(screen.getByText("add"));
    await waitFor(() => expect(useAddonError.getState().isOpen).toBe(true));
    expect(useCart.getState().items).toHaveLength(0);
    expect(typeof useAddonError.getState().retry).toBe("function");

    // The retry re-invokes add → second fetch.
    h.fetchQuestAddons.mockResolvedValueOnce([]);
    await act(async () => {
      useAddonError.getState().retry!();
    });
    await waitFor(() => expect(useCart.getState().items).toHaveLength(1));
  });

  it("addons [] → item added directly, cart drawer opened", async () => {
    h.fetchQuestAddons.mockResolvedValue([]);
    render(<Harness />);
    fireEvent.click(screen.getByText("add"));
    await waitFor(() => expect(useCart.getState().items).toHaveLength(1));
    expect(useCart.getState().isOpen).toBe(true);
    expect(useAddonPrompt.getState().isOpen).toBe(false);
  });

  it("non-empty addons → modal opened in 'add' mode, cart still empty", async () => {
    h.fetchQuestAddons.mockResolvedValue([{ id: "q", title: "Q", subtitle: "Q", price: 100 }]);
    render(<Harness />);
    fireEvent.click(screen.getByText("add"));
    await waitFor(() => expect(useAddonPrompt.getState().isOpen).toBe(true));
    expect(useAddonPrompt.getState().mode).toBe("add");
    expect(useCart.getState().items).toHaveLength(0);
  });

  it("hasQuestAddons false → zero fetches, direct add (the server flag decides)", async () => {
    render(<Harness hasQuest={false} />);
    fireEvent.click(screen.getByText("add"));
    await waitFor(() => expect(useCart.getState().items).toHaveLength(1));
    expect(h.fetchQuestAddons).not.toHaveBeenCalled();
  });

  it("double-tap in the same tick → exactly one fetch, one add", async () => {
    let resolve!: (v: unknown[]) => void;
    h.fetchQuestAddons.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<Harness />);
    const btn = screen.getByText("add");
    fireEvent.click(btn);
    fireEvent.click(btn); // second tap while the first is pending
    expect(h.fetchQuestAddons).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve([]); // resolve to "no quests" → one add
    });
    await waitFor(() => expect(useCart.getState().items).toHaveLength(1));
  });
});
