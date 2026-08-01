import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import QuestAddonModal from "@/components/QuestAddonModal";
import { useCart } from "@/store/useCart";
import { useAddonPrompt } from "@/store/useAddonPrompt";

// Incident-2 fix: EVERY choice writes a positive declaration onto the parent.
// 'quests' used to be left undefined, so deleting the quest lines silently
// reverted the parent to indistinguishable NULL. See TEST_PLAN §B6.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as Record<string, unknown>)} />;
  },
}));

const parent = { id: "exploration", title: "Map", subtitle: "Map cleaning", price: 1000 };
const questA = { id: "quest-a", title: "Quest A", subtitle: "Do Quest A", price: 500 };
const questB = { id: "quest-b", title: "Quest B", subtitle: "Do Quest B", price: 300 };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  useCart.setState({ items: [], isOpen: false });
  useAddonPrompt.setState({ isOpen: false, parent: null, addons: [], parentQuantity: 1, mode: "add" });
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(cleanup);

function openModal(mode: "add" | "declare", quantity = 1) {
  act(() => {
    useAddonPrompt.getState().open(parent, [questA, questB], quantity, mode);
  });
}
const line = (id: string) => useCart.getState().items.find((i) => i.id === id);
const syncCalls = () =>
  fetchMock.mock.calls.filter((c) => String(c[0]).includes("/api/cart/sync")).length;

describe("QuestAddonModal", () => {
  it("tick questA + «Добавить с заданиями» → parent 'quests' at qty 2, questA a separate line, ONE sync", async () => {
    render(<QuestAddonModal />);
    openModal("add", 2);
    await waitFor(() => screen.getByText("Do Quest A"));

    fireEvent.click(screen.getByText("Do Quest A")); // tick questA
    fireEvent.click(screen.getByText(/Добавить с заданиями/));

    await waitFor(() => expect(line("exploration")).toBeTruthy());
    expect(line("exploration")!.addonChoice).toBe("quests");
    expect(line("exploration")!.quantity).toBe(2);
    expect(line("quest-a")).toBeTruthy();
    expect(line("quest-b")).toBeFalsy(); // only the ticked one
    expect(syncCalls()).toBe(1); // one batched sync, not one per line
  });

  it("«Задания уже выполнены» → parent with 'completed'", async () => {
    render(<QuestAddonModal />);
    openModal("add", 1);
    await waitFor(() => screen.getByText("Задания уже выполнены"));
    fireEvent.click(screen.getByText("Задания уже выполнены"));
    await waitFor(() => expect(line("exploration")).toBeTruthy());
    expect(line("exploration")!.addonChoice).toBe("completed");
  });

  it("declare mode with the parent already at qty 5 → 'self' set WITHOUT changing quantity", async () => {
    useCart.setState({ items: [{ ...parent, quantity: 5 }] });
    render(<QuestAddonModal />);
    openModal("declare", 1);
    await waitFor(() => screen.getByText("Пройду их сам"));
    fireEvent.click(screen.getByText("Пройду их сам"));
    await waitFor(() => expect(line("exploration")!.addonChoice).toBe("self"));
    expect(line("exploration")!.quantity).toBe(5); // untouched
  });

  it("declare mode with ticked quests → appends the quest lines and sets 'quests'", async () => {
    useCart.setState({ items: [{ ...parent, quantity: 3 }] });
    render(<QuestAddonModal />);
    openModal("declare", 1);
    await waitFor(() => screen.getByText("Do Quest B"));
    fireEvent.click(screen.getByText("Do Quest B"));
    fireEvent.click(screen.getByText(/Добавить задания/));
    await waitFor(() => expect(line("quest-b")).toBeTruthy());
    expect(line("exploration")!.addonChoice).toBe("quests");
    expect(line("exploration")!.quantity).toBe(3); // declare never changes qty
  });
});
