"use client";

import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  /** Box size in pixels (default 22). */
  size?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * A modern animated checkbox — brand-blue fill when checked, a check mark
 * that scales/fades in, and a springy hover/active scale. Replaces native
 * <input type="checkbox"> across the site.
 */
export default function Checkbox({
  checked,
  onChange,
  disabled = false,
  id,
  size = 22,
  className = "",
  "aria-label": ariaLabel,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      id={id}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{ width: size, height: size }}
      className={`checkbox-custom ${
        checked ? "checkbox-custom-checked" : "checkbox-custom-unchecked"
      } ${className}`}
    >
      <Check
        size={Math.round(size * 0.64)}
        strokeWidth={3}
        className={`text-white transition-all duration-300 ${
          checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`}
      />
    </button>
  );
}
