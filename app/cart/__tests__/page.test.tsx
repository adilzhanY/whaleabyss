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

/**
 * Below lg the consent checkbox stacks to the very bottom of the page while the
 * pay CTA is duplicated in a bar pinned to the viewport. Setting an error next
 * to an off-screen checkbox reads, from the customer's position, as «the pay
 * button does nothing» — so the guard has to bring them to the blocker.
 */
describe("/cart scroll-to-blocker on the pinned mobile pay bar", () => {
  const CONSENT_LABEL = "Согласие на обработку персональных данных";
  let scrollSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollSpy = vi.spyOn(window.HTMLElement.prototype, "scrollIntoView");
  });
  afterEach(() => scrollSpy.mockRestore());

  /** The pinned bar's CTA — the desktop one reads «Перейти к оплате». */
  const tapMobilePay = async () => {
    await waitFor(() => expect(screen.getByText("Оплатить")).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByText("Оплатить"));
    });
  };

  it("scrolls the consent row into view, smoothly and centred, and focuses it", async () => {
    render(<CartPage />);
    await tapMobilePay();

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });

    // Centred, not `start`: the pinned bar covers the bottom of the viewport.
    // And it must be the CONSENT row that scrolled, not some other element.
    const checkbox = screen.getByLabelText(CONSENT_LABEL);
    expect(scrollSpy.mock.instances[0]).toContainElement(checkbox);

    // Keyboard/screen-reader users land on the control, so paying is one
    // keystroke away rather than a hunt back down the page.
    expect(document.activeElement).toBe(checkbox);

    // The reason is still stated, right under the row we scrolled to.
    expect(screen.getByText(/Необходимо согласиться/)).toBeTruthy();
  });

  it("plays the attention pulse and clears it on a timer, so it can replay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<CartPage />);
      await tapMobilePay();

      const row = screen.getByLabelText(CONSENT_LABEL).parentElement!;
      expect(row).toHaveClass("field-attention");

      // Cleared on a timer rather than `animationend`: that event never fires
      // if the animation doesn't run, which would strand the ring permanently.
      await act(async () => {
        vi.advanceTimersByTime(1400);
      });
      expect(row).not.toHaveClass("field-attention");

      // ...and a second tap replays it rather than doing nothing.
      await tapMobilePay();
      expect(row).toHaveClass("field-attention");
    } finally {
      vi.useRealTimers();
    }
  });

  it("honours prefers-reduced-motion: jumps instead of animating, and no pulse", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    render(<CartPage />);
    await tapMobilePay();

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
    // The pulse never runs under reduced motion, so animationend never fires —
    // applying the class would strand it on the row forever.
    expect(screen.getByLabelText(CONSENT_LABEL).parentElement!).not.toHaveClass(
      "field-attention"
    );
    vi.unstubAllGlobals();
  });

  it("does not hijack the page once consent IS given — checkout proceeds", async () => {
    checkoutResponse = () => new Response(JSON.stringify({ url: "https://pay.example/x" }), { status: 200 });
    render(<CartPage />);
    await waitFor(() => expect(screen.getByText("Оплатить")).toBeTruthy());
    fireEvent.click(screen.getByLabelText(CONSENT_LABEL));
    await act(async () => {
      fireEvent.click(screen.getByText("Оплатить"));
    });

    expect(scrollSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/Необходимо согласиться/)).toBeNull();
  });
});

/** Same blind spot, the other three guards: the «Ваши данные» inputs sit in the
 *  left column, equally off-screen from the pinned bar. */
describe("/cart scroll-to-blocker for the profile fields", () => {
  const CONSENT_LABEL = "Согласие на обработку персональных данных";
  let scrollSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollSpy = vi.spyOn(window.HTMLElement.prototype, "scrollIntoView");
  });
  afterEach(() => scrollSpy.mockRestore());

  /** Consent given, so the next guard down is the one under test. */
  const consentThenPay = async () => {
    await waitFor(() => expect(screen.getByText("Оплатить")).toBeTruthy());
    fireEvent.click(screen.getByLabelText(CONSENT_LABEL));
    await act(async () => {
      fireEvent.click(screen.getByText("Оплатить"));
    });
  };

  /** Empty the profile so a given field comes back blank. */
  const blankProfile = (over: Record<string, unknown>) => {
    const original = globalThis.fetch as unknown as (url: string) => Promise<Response>;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/api/user/profile"))
          return Promise.resolve(
            new Response(
              JSON.stringify({ adventureRank: 30, receiptEmail: "c@x.ru", telegramUsername: "c", ...over }),
              { status: 200 }
            )
          );
        return original(url);
      })
    );
  };

  const rowOf = (labelText: string) =>
    screen.getByText(labelText).parentElement!;

  it("an empty Ранг приключений scrolls to that field, not to the consent row", async () => {
    blankProfile({ adventureRank: null });
    render(<CartPage />);
    await consentThenPay();

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    const rankRow = rowOf("Ранг приключений:");
    expect(scrollSpy.mock.instances[0]).toBe(rankRow);
    expect(rankRow).toHaveClass("field-attention");
    // The focused control is the input itself, so typing works immediately.
    expect(document.activeElement).toBe(rankRow.querySelector("input"));
  });

  it("an empty E-mail scrolls to the email field", async () => {
    blankProfile({ receiptEmail: "" });
    render(<CartPage />);
    await consentThenPay();
    expect(scrollSpy.mock.instances[0]).toBe(rowOf("E-mail для чека:"));
  });

  it("an empty Telegram scrolls to the telegram field", async () => {
    blankProfile({ telegramUsername: "" });
    render(<CartPage />);
    await consentThenPay();
    expect(scrollSpy.mock.instances[0]).toBe(rowOf("Username в Telegram:"));
  });

  it("an out-of-range rank scrolls to the rank field", async () => {
    blankProfile({ adventureRank: 999 });
    render(<CartPage />);
    await consentThenPay();
    expect(screen.getByText(/числом от 1 до 60/)).toBeTruthy();
    expect(scrollSpy.mock.instances[0]).toBe(rowOf("Ранг приключений:"));
  });
});
