/**
 * Customer order card.
 *
 * Covers the two things that are easy to break silently: the «Качер на
 * аккаунте» badge, whose whole value is that it appears the moment a booster
 * logs in and disappears when they leave, and the collapsed positions list.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderCard from "@/components/OrderCard";

afterEach(cleanup);

const BASE = {
  id: "3da20c65-4154-4246-9f37-e4f2d568a4ff",
  status: "in_progress",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  totalPrice: 3300,
  items: [
    { serviceName: "ИНАДЗУМА 100%", quantity: 1 },
    { serviceName: "В ГОРАХ", quantity: 2 },
  ],
};

describe("«Качер на аккаунте» badge", () => {
  it("is shown while the booster is on the account", () => {
    render(<OrderCard order={{ ...BASE, boosterOnline: true }} />);
    expect(screen.getByText("Качер на аккаунте")).toBeInTheDocument();
  });

  it("is hidden when the booster has not flipped the toggle", () => {
    render(<OrderCard order={{ ...BASE, boosterOnline: false }} />);
    expect(screen.queryByText("Качер на аккаунте")).not.toBeInTheDocument();
  });

  it("is hidden once the order leaves «в работе», whatever the flag says", () => {
    render(<OrderCard order={{ ...BASE, status: "completed", boosterOnline: true }} />);
    expect(screen.queryByText("Качер на аккаунте")).not.toBeInTheDocument();
  });
});

describe("positions list", () => {
  const many = {
    ...BASE,
    items: Array.from({ length: 10 }, (_, i) => ({ serviceName: `Услуга ${i + 1}`, quantity: 1 })),
  };

  it("leads with three and hides the rest behind «Ещё N»", () => {
    render(<OrderCard order={many} />);
    expect(screen.getByRole("button", { name: /Ещё 7/ })).toHaveAttribute("aria-expanded", "false");
    // The rest are in the DOM (so the reveal can animate) but the row is collapsed.
    expect(screen.getByText("Услуга 10")).toBeInTheDocument();
  });

  it("expands and collapses again", async () => {
    const user = userEvent.setup();
    render(<OrderCard order={many} />);

    await user.click(screen.getByRole("button", { name: /Ещё 7/ }));
    const collapse = screen.getByRole("button", { name: /Свернуть/ });
    expect(collapse).toHaveAttribute("aria-expanded", "true");

    await user.click(collapse);
    expect(screen.getByRole("button", { name: /Ещё 7/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("shows no toggle when everything already fits", () => {
    render(<OrderCard order={BASE} />);
    expect(screen.queryByRole("button", { name: /Ещё/ })).not.toBeInTheDocument();
  });

  it("declines the service count correctly", () => {
    render(<OrderCard order={many} />);
    expect(screen.getByText("10 услуг")).toBeInTheDocument();
  });
});
