/**
 * Mobile cart FAB.
 *
 * The button is a pure reader of the cart store, so the interesting cases are
 * all about what it reflects and when it gets out of the way: an empty cart
 * must show no badge at all, a line removed from the store must drop the count
 * (this is the surface where a stale badge would be most visible), and it must
 * not float over the drawer or over /cart's own pay bar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CartFab from "@/components/CartFab";
import { useCart, type CartItem } from "@/store/useCart";

const pathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

const item = (over: Partial<CartItem> = {}): CartItem => ({
  id: "abyss-36",
  title: "Витая Бездна",
  subtitle: "Витая Бездна 36★",
  price: 2000,
  quantity: 1,
  ...over,
});

const fab = () => screen.queryByRole("button", { name: /Корзина/ });

beforeEach(() => {
  // The store fires an un-awaited /api/cart/sync on mutation; keep it inert.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  useCart.setState({ items: [], isOpen: false });
  pathnameMock.mockReturnValue("/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("badge", () => {
  it("an empty cart renders the button with NO badge", () => {
    render(<CartFab />);
    expect(fab()).toBeInTheDocument();
    expect(fab()).toHaveAccessibleName("Корзина, пусто");
    expect(document.querySelector(".cart-fab__badge")).toBeNull();
  });

  it("shows the number of items and names it for screen readers", () => {
    useCart.setState({ items: [item(), item({ id: "spiral-9", quantity: 2 })] });
    render(<CartFab />);
    expect(document.querySelector(".cart-fab__badge")).toHaveTextContent("3");
    expect(fab()).toHaveAccessibleName("Корзина, товаров: 3");
  });

  it("a removed line drops out of the count immediately", async () => {
    useCart.setState({ items: [item(), item({ id: "spiral-9" })] });
    render(<CartFab />);
    expect(document.querySelector(".cart-fab__badge")).toHaveTextContent("2");

    await act(async () => {
      useCart.getState().removeFromCart("spiral-9");
    });
    expect(document.querySelector(".cart-fab__badge")).toHaveTextContent("1");

    // Emptying it removes the badge entirely rather than leaving a "0".
    await act(async () => {
      useCart.getState().removeFromCart("abyss-36");
    });
    expect(document.querySelector(".cart-fab__badge")).toBeNull();
    expect(fab()).toHaveAccessibleName("Корзина, пусто");
  });

  it("clearCart empties the badge too", async () => {
    useCart.setState({ items: [item({ quantity: 4 })] });
    render(<CartFab />);
    expect(document.querySelector(".cart-fab__badge")).toHaveTextContent("4");

    await act(async () => {
      useCart.getState().clearCart();
    });
    expect(document.querySelector(".cart-fab__badge")).toBeNull();
  });

  it("caps at 9+ so it agrees with the header badge on the same cart", () => {
    useCart.setState({ items: [item({ quantity: 12 })] });
    render(<CartFab />);
    expect(document.querySelector(".cart-fab__badge")).toHaveTextContent("9+");
    // The label still carries the real number — the cap is a layout concern.
    expect(fab()).toHaveAccessibleName("Корзина, товаров: 12");
  });

  it("a per-day booking counts as ONE line, not one per day", () => {
    // `quantity` means days for these; 30 days must not read as "9+".
    useCart.setState({
      items: [item({ quantity: 30, startDate: "2026-08-01", endDate: "2026-08-30" })],
    });
    render(<CartFab />);
    expect(document.querySelector(".cart-fab__badge")).toHaveTextContent("1");
  });
});

describe("hydration", () => {
  it("the server never renders the badge, so the markup can't mismatch", async () => {
    // `items` lives in localStorage, so the server always sees an empty cart
    // while the client rehydrates to the real one. If the badge rendered before
    // mount, every page load with a non-empty cart would be a hydration error.
    const { renderToString } = await import("react-dom/server");
    useCart.setState({ items: [item({ quantity: 3 })] });

    const html = renderToString(<CartFab />);
    expect(html).toContain("cart-fab");
    expect(html).not.toContain("cart-fab__badge");
    // The button itself IS server-rendered, so it doesn't pop in after hydration.
    expect(html).toContain("Корзина, пусто");
  });
});

describe("where it appears", () => {
  it("opens the drawer on tap", async () => {
    render(<CartFab />);
    await userEvent.click(fab()!);
    expect(useCart.getState().isOpen).toBe(true);
  });

  it("gets out of the way once the drawer is open", () => {
    useCart.setState({ items: [item()], isOpen: true });
    render(<CartFab />);
    expect(fab()).not.toBeInTheDocument();
  });

  it("is absent on /cart, whose own pay bar owns the bottom edge", () => {
    pathnameMock.mockReturnValue("/cart");
    useCart.setState({ items: [item()] });
    render(<CartFab />);
    expect(fab()).not.toBeInTheDocument();
  });

  it("is absent in the admin panel and the booster portal", () => {
    useCart.setState({ items: [item()] });

    pathnameMock.mockReturnValue("/admin/orders");
    const admin = render(<CartFab />);
    expect(fab()).not.toBeInTheDocument();
    admin.unmount();

    pathnameMock.mockReturnValue("/portal/orders");
    render(<CartFab />);
    expect(fab()).not.toBeInTheDocument();
  });

  it("is still present on a normal page with an empty cart", () => {
    pathnameMock.mockReturnValue("/services");
    render(<CartFab />);
    expect(fab()).toBeInTheDocument();
  });
});
