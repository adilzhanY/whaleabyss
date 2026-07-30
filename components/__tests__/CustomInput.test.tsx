/**
 * Tests for the site-wide CustomInput.
 *
 * The visual recipe lives in CSS (HeroUI `.input`), so these verify the
 * component's contract: class composition per size, native prop passthrough,
 * ref forwarding, controlled usage, and the `sanitize` live transform.
 */
import { describe, expect, it, vi } from "vitest";
import { createRef, useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach } from "vitest";
import CustomInput from "@/components/CustomInput";

afterEach(cleanup);

describe("styling contract", () => {
  it("applies the field recipe and the taller md height by default", () => {
    render(<CustomInput placeholder="Имя" />);
    const el = screen.getByPlaceholderText("Имя");
    expect(el).toHaveClass("custom-input", "w-full", "custom-input--md");
    expect(el).not.toHaveClass("custom-input--sm");
  });

  it("fieldSize=sm renders the toolbar height (matches the table SearchField)", () => {
    render(<CustomInput fieldSize="sm" placeholder="Поиск" />);
    const el = screen.getByPlaceholderText("Поиск");
    expect(el).toHaveClass("custom-input", "custom-input--sm");
    expect(el).not.toHaveClass("custom-input--md");
  });

  it("appends call-site className after the base classes so overrides win", () => {
    render(<CustomInput placeholder="x" className="pl-12 font-mono" />);
    const el = screen.getByPlaceholderText("x");
    expect(el.className).toMatch(/custom-input .*pl-12 font-mono/);
  });
});

describe("native behaviour", () => {
  it("forwards the ref to the real input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<CustomInput ref={ref} placeholder="x" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    ref.current!.focus();
    expect(ref.current).toHaveFocus();
  });

  it("passes through native attributes (type, maxLength, disabled...)", () => {
    render(<CustomInput placeholder="x" type="email" maxLength={5} required disabled />);
    const el = screen.getByPlaceholderText("x");
    expect(el).toHaveAttribute("type", "email");
    expect(el).toHaveAttribute("maxlength", "5");
    expect(el).toBeRequired();
    expect(el).toBeDisabled();
  });

  it("typing is blocked while disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomInput placeholder="x" disabled onChange={onChange} />);
    await user.type(screen.getByPlaceholderText("x"), "abc").catch(() => {});
    expect(onChange).not.toHaveBeenCalled();
  });

  it("works as a controlled component", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [v, setV] = useState("");
      return (
        <CustomInput
          placeholder="email"
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
      );
    }
    render(<Harness />);
    const el = screen.getByPlaceholderText("email");
    await user.type(el, "hi@wa.ru");
    expect(el).toHaveValue("hi@wa.ru");
  });
});

describe("sanitize", () => {
  const stripDigits = (v: string) => v.replace(/\d/g, "");

  it("rewrites the value before onChange fires", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [v, setV] = useState("");
      return (
        <CustomInput
          placeholder="s"
          sanitize={stripDigits}
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
      );
    }
    render(<Harness />);
    const el = screen.getByPlaceholderText("s");
    await user.type(el, "a1b2c");
    expect(el).toHaveValue("abc");
  });

  it("leaves clean values untouched", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    render(
      <CustomInput
        placeholder="s"
        sanitize={stripDigits}
        onChange={(e) => seen.push(e.target.value)}
      />
    );
    await user.type(screen.getByPlaceholderText("s"), "ab");
    expect(seen).toEqual(["a", "ab"]);
  });
});
