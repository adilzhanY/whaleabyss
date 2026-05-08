"use client";

import { Search, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = "Поиск услуг..." }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for 300ms debounce
    debounceTimer.current = setTimeout(() => {
      onSearch(query);
    }, 300);

    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-12">
      <div
        className={[
          "relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300",
          "bg-white border-2",
          isFocused
            ? "border-blue-500 shadow-lg shadow-blue-500/20"
            : "border-slate-200 hover:border-slate-300",
        ].join(" ")}
      >
        <Search
          className={[
            "w-5 h-5 shrink-0 transition-colors duration-300",
            isFocused ? "text-blue-600" : "text-slate-400",
          ].join(" ")}
          strokeWidth={2.25}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-base"
          style={{ fontFamily: "var(--font-primary), sans-serif" }}
        />
        {query && (
          <button
            onClick={handleClear}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
            aria-label="Очистить поиск"
          >
            <X className="w-4 h-4 text-slate-500" strokeWidth={2.25} />
          </button>
        )}
      </div>
      {query && (
        <p className="text-sm text-slate-500 mt-2 text-center">
          Поиск: "{query}"
        </p>
      )}
    </div>
  );
}
