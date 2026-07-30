"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Layout only (width, margins). The look is owned by `.custom-select__*`
   *  in globals.css so every dropdown on the site changes together. */
  className?: string;
  /**
   * `sm` (default) - toolbar/table height, as on the admin filter rows.
   * `md` - one step taller, matches `CustomInput`/`CustomSearchField` `md`.
   */
  fieldSize?: "sm" | "md";
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * The site-wide dropdown - replaces the native <select>, which can't be
 * styled to match the brand and renders as raw OS chrome.
 * - hover cursor on the trigger
 * - chevron inset from the edge (not flush against it)
 * - animated open/close, click-outside and Escape to dismiss, rounded rows
 */
export default function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  fieldSize = "sm",
  placeholder = "Выберите...",
  disabled = false,
  ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  // Index highlighted by the keyboard. Focus stays on the trigger and the
  // active row is advertised via aria-activedescendant, so the listbox needs
  // no focus juggling of its own.
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const selectedOption = options.find((opt) => opt.value === value);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150); // match animation duration
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    handleClose();
  };

  const openMenu = () => {
    // Start the highlight on the current value so arrow keys continue from
    // where the user already is, not from the top of the list.
    const selectedIndex = options.findIndex((opt) => opt.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (isOpen) handleClose();
    else openMenu();
  };

  const open = isOpen && !isClosing;

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)
      ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeIndex]);

  /** Full keyboard operation, matching what the native <select> gave us. */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (options[activeIndex]) handleSelect(options[activeIndex].value);
        break;
      case "Tab":
        // Let focus leave, but don't strand an open menu behind it.
        handleClose();
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select custom-select--${fieldSize} ${
        open ? "custom-select--open" : ""
      } relative ${className}`}
    >
      <button
        type="button"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={
          open && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        className="custom-select__trigger"
      >
        <span
          className={`truncate ${
            selectedOption ? "" : "custom-select__placeholder"
          }`}
        >
          {selectedOption?.label || placeholder}
        </span>
      </button>

      <ChevronDown
        className={`custom-select__chevron absolute right-3.5 top-1/2 w-4 h-4 pointer-events-none -translate-y-1/2 transition-transform duration-200 ease-in-out ${
          open ? "rotate-180" : "rotate-0"
        }`}
      />

      {isOpen && (
        <div
          className={`custom-select__menu ${
            isClosing ? "cs-dropdown-exit" : "cs-dropdown-enter"
          } absolute z-50 min-w-full mt-2 overflow-hidden`}
        >
          {/* role="listbox" belongs on the element that directly owns the
              options — with the scroll container in between, the options drop
              out of the accessibility tree entirely. */}
          <div
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-60 overflow-y-auto py-1.5"
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={option.value === value}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`custom-select__option ${
                  option.value === value
                    ? "custom-select__option--selected"
                    : ""
                } ${
                  index === activeIndex ? "custom-select__option--active" : ""
                } mx-1.5 my-0.5 px-3 py-2 cursor-pointer transition-colors select-none whitespace-nowrap`}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
