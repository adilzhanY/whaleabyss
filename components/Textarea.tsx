"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Multi-line counterpart to <Input>. Same animated focus border and brand
 * caret, but a rounded rectangle instead of a pill (see `.input-field` and
 * `.input-field--area` in globals.css).
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = "", ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`input-field input-field--area ${className}`}
      {...props}
    />
  );
});

export default Textarea;
