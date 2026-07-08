"use client";

import Input, { type InputProps } from "@/components/Input";

/**
 * Branded date input that always displays its value as dd/mm/yyyy, regardless
 * of the browser locale — a native <input type="date"> renders the value in
 * the user's OS/browser locale (mm/dd/yyyy on English systems), which can't
 * be overridden with HTML. The native input keeps full functionality
 * (calendar picker, min/max, mobile wheels); its own text is made transparent
 * and the formatted value is drawn on top as a pointer-events-none overlay.
 */
export default function DateInput({ className = "", ...props }: InputProps) {
  const value = typeof props.value === "string" ? props.value : "";
  const display = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
    : "";
  return (
    <div className="relative">
      <Input type="date" className={`text-transparent ${className}`} {...props} />
      {/* left-5 matches .input-field's 1.25rem horizontal padding */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-sm text-slate-700"
      >
        {display}
      </span>
    </div>
  );
}
