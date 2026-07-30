"use client";

import { SearchField } from "@heroui/react";

export interface CustomSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /**
   * `sm` (default) - toolbar/table height, as on the /admin/orders filter row.
   * `md` - one step taller, matches `CustomInput` `md` for public-site forms.
   */
  fieldSize?: "sm" | "md";
  ariaLabel?: string;
  /** For typeahead call sites that open a dropdown on focus. */
  onFocus?: () => void;
}

/**
 * Site-wide search input - the /admin/orders SearchField recipe (filled,
 * borderless, leading search icon and trailing clear button laid out in a
 * flex group). Styled via `.custom-search-field` in globals.css, which covers
 * both admin-dark and site-dark palettes.
 */
export default function CustomSearchField({
  value,
  onChange,
  placeholder,
  className = "",
  fieldSize = "sm",
  ariaLabel = "Поиск",
  onFocus,
}: CustomSearchFieldProps) {
  return (
    <SearchField
      aria-label={ariaLabel}
      value={value}
      onChange={onChange}
      className={`custom-search-field custom-search-field--${fieldSize} ${className}`}
    >
      <SearchField.Group className="w-full">
        <SearchField.SearchIcon />
        <SearchField.Input placeholder={placeholder} onFocus={onFocus} />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}
