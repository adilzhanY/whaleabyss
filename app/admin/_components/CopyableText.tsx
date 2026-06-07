"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Check } from "lucide-react";

/** Shared copy-to-clipboard state with the animated «Скопировано» timeout. */
function useCopyToClipboard(value: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — silently ignore.
    }
  }, [value]);

  return { copied, copy };
}

/** The animated confirmation shown after a successful copy. */
function CopiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium animate-copiedPop">
      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
      Скопировано
    </span>
  );
}

/**
 * Standalone copy icon-button. Use next to content that has its own click
 * behaviour (e.g. a link) where wrapping it in a button isn't possible.
 */
export function CopyButton({ value }: { value: string }) {
  const { copied, copy } = useCopyToClipboard(value);

  if (copied) return <CopiedBadge />;

  return (
    <button
      type="button"
      onClick={copy}
      title="Скопировать"
      className="text-slate-400 hover:text-slate-700 cursor-pointer transition-colors shrink-0"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
}

/**
 * Clickable text that copies `value` to the clipboard. Renders `children`
 * (or the value itself); a copy icon appears on hover, and an animated
 * «Скопировано» confirmation replaces it after a copy.
 */
export default function CopyableText({
  value,
  children,
  className = "",
}: {
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { copied, copy } = useCopyToClipboard(value);

  return (
    <button
      type="button"
      onClick={copy}
      title="Скопировать"
      className={`group inline-flex items-center gap-1.5 text-left cursor-pointer max-w-full ${className}`}
    >
      {children ?? <span className="truncate">{value}</span>}
      {copied ? (
        <CopiedBadge />
      ) : (
        <Copy className="w-3.5 h-3.5 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
