import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import { useCart } from "@/store/useCart";
import { useAddonPrompt } from "@/store/useAddonPrompt";

// The UX half of the revenue gate: a 409 must re-open the declare modal, not
// dead-end at «Ошибка при создании заказа». See TEST_PLAN §B7.
const h = vi.hoisted(() => ({
  useSession: vi.fn(),
  confirmDialog: vi.fn(),
}));
vi.mock("next-auth/react", () => ({ useSession: h.useSession }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/store/useConfirm", () => ({ confirmDialog: h.confirmDialog }));
// Shell components → null renderers, so the page under test is just the cart.
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/Breadcrumb", () => ({ default: () => null }));
vi.mock("@/components/AuthModal", () => ({ default: () => null }));
vi.mock("@/components/DataSecurityModal", () => ({ default: () => null }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (p: Record<string, unknown>) => <img {...p} />,
}));

const LINE = { id: "slug-x", title: "Map", subtitle: "Map cleaning", price: 1000, quantity: 2 };

/** Route fetch by URL; each test overrides `checkoutResponse` / `addonsResponse`. */
let checkoutResponse: () => Response;
let addonsResponse: () => Response;
function installFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("/api/user/profile"))
        return Promise.resolve(
          new Response(JSON.stringify({ adventureRank: 30, receiptEmail: "c@x.ru", telegramUsername: "c" }), { status: 200 })
        );
      if (u.includes("/api/cart/meta"))
        return Promise.resolve(new Response(JSON.stringify({ items: {}, recommendations: [] }), { status: 200 }));
      if (u.includes("/api/cart/sync")) return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      if (u.includes("/addons")) return Promise.resolve(addonsResponse());
      if (u.includes("/api/checkout")) return Promise.resolve(checkoutResponse());
      return Promise.resolve(new Response("{}", { status: 200 }));
    })
  );
}

beforeEach(() => {
  useCart.setState({ items: [{ ...LINE }], isOpen: false });
  useAddonPrompt.setState({ isOpen: false, parent: null, addons: [], parentQuantity: 1, mode: "add" });
  h.useSession.mockReturnValue({ data: { user: { id: "u1", role: "user" } } });
  h.confirmDialog.mockReset();
  checkoutResponse = () =>
    new Response(JSON.stringify({ code: "ADDON_CHOICE_REQUIRED", slugs: ["slug-x"] }), { status: 409 });
  addonsResponse = () => new Response(JSON.stringify({ addons: [{ id: "q", title: "Q", subtitle: "Do Q", price: 500 }] }), { status: 200 });
  installFetch();
});
afterEach(cleanup);

async function agreeAndPay() {
  // Wait for the profile effect to populate AR/email/telegram.
  await waitFor(() => expect(screen.getByText("Перейти к оплате")).toBeTruthy());
  fireEvent.click(screen.getByLabelText("Согласие на обработку персональных данных"));
  await act(async () => {
    fireEvent.click(screen.getByText("Перейти к оплате"));
  });
}

describe("/cart 409 recovery", () => {
  it("checkout 409 → declare modal re-opens for slug-x at the line's quantity, cart unchanged, no error", async () => {
    render(<CartPage />);
    await agreeAndPay();

    await waitFor(() => expect(useAddonPrompt.getState().isOpen).toBe(true));
    const st = useAddonPrompt.getState();
    expect(st.mode).toBe("declare");
    expect(st.parent?.id).toBe("slug-x");
    expect(st.parentQuantity).toBe(2);
    expect(useCart.getState().items).toHaveLength(1); // untouched
    expect(screen.queryByText(/Ошибка при создании заказа/)).toBeNull();
  });

  it("409 but /addons fails (503) → the fallback error text renders (never silently nothing)", async () => {
    addonsResponse = () => new Response("", { status: 503 });
    render(<CartPage />);
    await agreeAndPay();
    await waitFor(() =>
      expect(screen.getByText(/Уточните, что делать с заданиями/)).toBeTruthy()
    );
    expect(useAddonPrompt.getState().isOpen).toBe(false);
  });

  it("checkout 422 with a plain-text body → the server text shows verbatim (Adventure Rank gate)", async () => {
    checkoutResponse = () => new Response("Услуга «X» доступна с 45 ранга приключений, а ваш ранг — 30.", { status: 422 });
    render(<CartPage />);
    await agreeAndPay();
    await waitFor(() =>
      expect(screen.getByText(/Услуга «X» доступна с 45 ранга/)).toBeTruthy()
    );
  });
});

describe("/cart destructive decrement guard", () => {
  it("«−» at quantity 1 asks first; line survives until confirmed, then one sync fires", async () => {
    useCart.setState({ items: [{ ...LINE, quantity: 1 }] });
    h.confirmDialog.mockResolvedValue(false); // user cancels first
    render(<CartPage />);
    await waitFor(() => screen.getByLabelText("Уменьшить"));

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Уменьшить"));
    });
    expect(h.confirmDialog).toHaveBeenCalledTimes(1);
    expect(useCart.getState().items).toHaveLength(1); // cancelled → survives

    // Confirm this time → removed.
    h.confirmDialog.mockResolvedValue(true);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Уменьшить"));
    });
    await waitFor(() => expect(useCart.getState().items).toHaveLength(0));
  });
});
