/**
 * Cart drawer tests.
 *
 * The drawer is driven entirely by the zustand store (no props), so tests
 * manipulate `useCart` state directly and assert on the rendered DOM. The
 * store's fire-and-forget /api/cart/sync calls are stubbed at the fetch level;
 * next/image and next/navigation are mocked because there is no Next runtime
 * in jsdom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CartModal from "@/components/CartModal";
import ConfirmDialogHost from "@/components/ConfirmDialogHost";
import { useCart, type CartItem } from "@/store/useCart";
import { useConfirmStore } from "@/store/useConfirm";

// The drawer now asks before deleting a line, and the confirmation is the
// shared site-wide dialog - so tests render the host alongside the drawer.
function renderCart() {
  return render(
    <>
      <CartModal />
      <ConfirmDialogHost />
    </>
  );
}

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
}));

// next/image needs the Next.js loader config; a plain <img> keeps the same
// onError semantics the fallback test relies on.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, onError, className } = props as {
      src: string;
      alt: string;
      onError?: () => void;
      className?: string;
    };
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} onError={onError} className={className} />;
  },
}));

const baseItem: CartItem = {
  id: "drakoniy-hrebet-100-1",
  title: "Исследование Драконьего хребта",
  subtitle: "Драконий Хребет 100%",
  price: 1200,
  quantity: 1,
  image: "https://storage.yandexcloud.net/whaleabyss-bucket/drakoniy.jpg",
};

const secondItem: CartItem = {
  id: "abyss-36",
  title: "Витая Бездна",
  subtitle: "Витая Бездна 36★",
  price: 2000,
  quantity: 2,
};

function setCart(items: CartItem[], isOpen = true) {
  useCart.setState({ items, isOpen });
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  );
  useCart.setState({ items: [], isOpen: false });
  useConfirmStore.setState({ open: false, options: null, pending: false, error: null, resolver: null });
  pushMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("visibility", () => {
  it("renders nothing while the store says closed", () => {
    setCart([baseItem], false);
    renderCart();
    expect(screen.queryByText("Корзина")).not.toBeInTheDocument();
  });

  it("opens when the store flips isOpen (e.g. header cart button)", async () => {
    renderCart();
    setCart([baseItem], true);
    expect(await screen.findByText("Корзина")).toBeInTheDocument();
    expect(screen.getByText("Драконий Хребет 100%")).toBeInTheDocument();
  });

  it("the close button closes the drawer through the store", async () => {
    const user = userEvent.setup();
    setCart([baseItem]);
    renderCart();
    await user.click(await screen.findByLabelText("Закрыть корзину"));
    await waitFor(() => expect(useCart.getState().isOpen).toBe(false));
  });

  it("Escape closes the drawer", async () => {
    const user = userEvent.setup();
    setCart([baseItem]);
    renderCart();
    await screen.findByText("Корзина");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(useCart.getState().isOpen).toBe(false));
  });
});

describe("content", () => {
  it("shows the empty state when there are no items", async () => {
    setCart([]);
    renderCart();
    expect(await screen.findByText("Ваша корзина пуста")).toBeInTheDocument();
    // No footer without items - nothing to pay for.
    expect(screen.queryByText("Перейти к оплате")).not.toBeInTheDocument();
  });

  it("renders line prices and the running total", async () => {
    setCart([baseItem, secondItem]);
    renderCart();
    await screen.findByText("Корзина");
    // 1 × 1200 and 2 × 2000, total 5200 (ru-RU uses a non-breaking space).
    expect(screen.getByText(/1\s?200\s?₽/)).toBeInTheDocument();
    expect(screen.getByText(/4\s?000\s?₽/)).toBeInTheDocument();
    expect(screen.getByText(/5\s?200\s?₽/)).toBeInTheDocument();
  });

  it("shows the per-day period for date-carrying items", async () => {
    setCart([
      { ...baseItem, startDate: "2026-07-28", endDate: "2026-07-30" },
    ]);
    renderCart();
    await screen.findByText("Корзина");
    expect(screen.getByText(/28\.07\.2026\s*-\s*30\.07\.2026/)).toBeInTheDocument();
  });

  it("shows the quest-addon declaration label", async () => {
    setCart([{ ...baseItem, addonChoice: "completed" }]);
    renderCart();
    await screen.findByText("Корзина");
    expect(screen.getByText("Задания уже выполнены")).toBeInTheDocument();
  });
});

describe("quantity controls", () => {
  it("plus increments the quantity in store and UI", async () => {
    const user = userEvent.setup();
    setCart([baseItem]);
    renderCart();
    await user.click(await screen.findByLabelText("Увеличить"));
    expect(useCart.getState().items[0].quantity).toBe(2);
    expect(await screen.findByText("2 шт.")).toBeInTheDocument();
  });

  it("minus decrements down to 1", async () => {
    const user = userEvent.setup();
    setCart([{ ...baseItem, quantity: 3 }]);
    renderCart();
    await user.click(await screen.findByLabelText("Уменьшить"));
    expect(useCart.getState().items[0].quantity).toBe(2);
  });

  it("minus at quantity 1 asks for confirmation instead of deleting silently", async () => {
    const user = userEvent.setup();
    setCart([baseItem]);
    renderCart();
    await user.click(await screen.findByLabelText("Уменьшить"));

    // Dropping to 0 removes the line, so «−» at 1 is a delete and must ask
    // exactly like the trash does — one misclick used to empty the line.
    expect(await screen.findByText("Удалить услугу из корзины?")).toBeInTheDocument();
    expect(useCart.getState().items).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Удалить" }));
    await waitFor(() => expect(useCart.getState().items).toHaveLength(0));
    expect(await screen.findByText("Ваша корзина пуста")).toBeInTheDocument();
  });

  it("cancelling the minus-at-1 confirmation keeps the line", async () => {
    const user = userEvent.setup();
    setCart([baseItem]);
    renderCart();
    await user.click(await screen.findByLabelText("Уменьшить"));
    await screen.findByText("Удалить услугу из корзины?");

    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(useConfirmStore.getState().open).toBe(false));
    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().items[0].quantity).toBe(1);
  });

  it("the trash button asks for confirmation before removing", async () => {
    const user = userEvent.setup();
    setCart([baseItem, secondItem]);
    renderCart();
    await screen.findByText("Корзина");
    await user.click(screen.getAllByLabelText("Удалить")[0]);

    // Nothing is gone until the user confirms.
    expect(await screen.findByText("Удалить услугу из корзины?")).toBeInTheDocument();
    expect(useCart.getState().items).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Удалить" }));
    await waitFor(() =>
      expect(useCart.getState().items.map((i) => i.id)).toEqual(["abyss-36"])
    );
  });

  it("cancelling the confirmation keeps the line", async () => {
    const user = userEvent.setup();
    setCart([baseItem]);
    renderCart();
    await screen.findByText("Корзина");
    await user.click(screen.getByLabelText("Удалить"));
    await screen.findByText("Удалить услугу из корзины?");

    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(useConfirmStore.getState().open).toBe(false));
    expect(useCart.getState().items).toHaveLength(1);
  });

  it("per-day items shift endDate together with quantity", async () => {
    const user = userEvent.setup();
    setCart([
      { ...baseItem, quantity: 2, startDate: "2026-07-28", endDate: "2026-07-29" },
    ]);
    renderCart();
    await user.click(await screen.findByLabelText("Увеличить"));
    const item = useCart.getState().items[0];
    expect(item.quantity).toBe(3);
    expect(item.endDate).toBe("2026-07-30");
  });
});

describe("checkout", () => {
  it("navigates to /cart and closes the drawer", async () => {
    const user = userEvent.setup();
    setCart([baseItem]);
    renderCart();
    await user.click(await screen.findByText("Перейти к оплате"));
    expect(pushMock).toHaveBeenCalledWith("/cart");
    expect(useCart.getState().isOpen).toBe(false);
  });
});

describe("failure modes", () => {
  it("falls back to the gradient placeholder when the image errors", async () => {
    setCart([baseItem]);
    renderCart();
    const img = await screen.findByAltText(baseItem.title);
    img.dispatchEvent(new Event("error"));
    // The placeholder renders the service title as its label.
    expect(await screen.findByText(baseItem.title)).toBeInTheDocument();
    expect(screen.queryByAltText(baseItem.title)).not.toBeInTheDocument();
  });

  it("renders the placeholder when an item has no image at all", async () => {
    setCart([secondItem]);
    renderCart();
    await screen.findByText("Корзина");
    expect(screen.getByText("Витая Бездна")).toBeInTheDocument();
  });

  it("survives malformed persisted data (NaN price / quantity)", async () => {
    setCart([
      { ...baseItem, price: Number.NaN, quantity: Number.NaN } as CartItem,
    ]);
    renderCart();
    await screen.findByText("Корзина");
    // No crash, and the broken numbers render as zeros the user can act on.
    expect(screen.getByText("0 шт.")).toBeInTheDocument();
    expect(screen.getAllByText(/0\s?₽/).length).toBeGreaterThan(0);
  });

  it("keeps working when the cart sync endpoint is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const user = userEvent.setup();
    setCart([baseItem]);
    renderCart();
    await user.click(await screen.findByLabelText("Увеличить"));
    // The optimistic local update must not be blocked by the failed sync.
    expect(useCart.getState().items[0].quantity).toBe(2);
    expect(await screen.findByText("2 шт.")).toBeInTheDocument();
  });

  it("deduplicates accidental duplicate lines from a corrupted cart", async () => {
    // Two lines with the same id (the historical localStorage race) - the UI
    // must not throw on duplicate React keys landing in the same list.
    setCart([baseItem, { ...baseItem, quantity: 5 }]);
    renderCart();
    await screen.findByText("Корзина");
    const list = screen.getAllByRole("listitem");
    expect(list.length).toBeGreaterThan(0);
  });

  it("re-opens cleanly after rapid open/close cycles", async () => {
    renderCart();
    for (let i = 0; i < 3; i++) {
      setCart([baseItem], true);
      await screen.findByText("Корзина");
      useCart.setState({ isOpen: false });
    }
    setCart([baseItem], true);
    expect(await screen.findByText("Корзина")).toBeInTheDocument();
    expect(within(screen.getAllByRole("listitem")[0]).getByText("1 шт.")).toBeInTheDocument();
  });
});
