"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Classes for the outer wrapper — use this to control width/layout (e.g. "w-full"). */
  className?: string;
  /** Classes for the trigger button — use this to control its look (bg, border, padding). */
  buttonClassName?: string;
  /** Classes for the dropdown panel — use this to control its look (bg, radius, shadow). */
  menuClassName?: string;
  /** Classes for each option row — use this to control its rounding. */
  optionClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

const DEFAULT_BUTTON_CLASS =
  "bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300";

const DEFAULT_MENU_CLASS =
  "bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-900/5";

/**
 * A modern, accessible dropdown that replaces the native <select>.
 * - hover cursor on the trigger
 * - chevron inset from the edge (not flush against it)
 * - animated open/close, click-outside to dismiss, rounded option rows
 */
export default function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  buttonClassName = DEFAULT_BUTTON_CLASS,
  menuClassName = DEFAULT_MENU_CLASS,
  optionClassName = "rounded-lg",
  placeholder = "Выберите...",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const toggleOpen = () => {
    if (disabled) return;
    if (isOpen) handleClose();
    else setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`w-full text-left flex items-center pr-10 outline-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-100 ${buttonClassName}`}
      >
        <span className={`truncate ${!selectedOption ? "text-slate-400" : ""}`}>
          {selectedOption?.label || placeholder}
        </span>
      </button>

      <ChevronDown
        className={`absolute right-3.5 top-1/2 w-4 h-4 text-slate-400 pointer-events-none -translate-y-1/2 transition-transform duration-200 ease-in-out ${
          isOpen && !isClosing ? "rotate-180" : "rotate-0"
        }`}
      />

      {isOpen && (
        <div
          className={`${
            isClosing ? "cs-dropdown-exit" : "cs-dropdown-enter"
          } absolute z-50 min-w-full mt-2 overflow-hidden ${menuClassName}`}
        >
          <div className="max-h-60 overflow-y-auto py-1.5">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`mx-1.5 my-0.5 px-3 py-2 ${optionClassName} cursor-pointer text-sm transition-colors select-none whitespace-nowrap ${
                  option.value === value
                    ? "bg-blue-50 text-blue-900 font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
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
