"use client";

import { forwardRef, type InputHTMLAttributes, type ChangeEvent } from "react";

export interface CustomInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Optional live transform applied to the value before `onChange` fires -
   * e.g. `stripNonLatin` to block Cyrillic in a password field. The native
   * input stays controlled because we rewrite `event.target.value` in place.
   */
  sanitize?: (value: string) => string;
  /**
   * `md` (default) - forms everywhere: one step taller than the table search.
   * `sm` - toolbar/table height, identical to the /admin/orders SearchField.
   */
  fieldSize?: "md" | "sm";
}

/**
 * Site-wide text input - the same recipe as the SearchField on the
 * /admin/orders table: filled, borderless, control radius, soft blue glow
 * easing in on focus (`.custom-input` in globals.css). Forwards the ref and
 * spreads every native attribute, so each call site keeps its own type /
 * placeholder / maxLength / pattern / etc.
 */
const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  function CustomInput(
    { className = "", fieldSize = "md", sanitize, onChange, ...props },
    ref
  ) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (sanitize) {
        const cleaned = sanitize(e.target.value);
        if (cleaned !== e.target.value) e.target.value = cleaned;
      }
      onChange?.(e);
    };

    return (
      <input
        ref={ref}
        onChange={handleChange}
        className={`custom-input w-full ${
          fieldSize === "md" ? "custom-input--md" : "custom-input--sm"
        } ${className}`}
        {...props}
      />
    );
  }
);

export default CustomInput;
