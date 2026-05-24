"use client";

import { forwardRef, type InputHTMLAttributes, type ChangeEvent } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Optional live transform applied to the value before `onChange` fires —
   * e.g. `stripNonLatin` to block Cyrillic in a password field. The native
   * input stays controlled because we rewrite `event.target.value` in place.
   */
  sanitize?: (value: string) => string;
}

/**
 * Site-wide text input. Fully rounded, brand-coloured caret, and a focus
 * border that animates in with the primary colour (see `.input-field` in
 * globals.css). Forwards the ref and spreads every native attribute, so each
 * call site keeps its own type / placeholder / maxLength / pattern / etc.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", sanitize, onChange, ...props },
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
      className={`input-field ${className}`}
      {...props}
    />
  );
});

export default Input;
