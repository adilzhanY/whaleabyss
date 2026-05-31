"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import TelegramIcon from "@/components/TelegramIcon";

/**
 * Client cell: Telegram username with a Telegram glyph on the left and a copy
 * button. On copy, shows an animated «Скопировано» confirmation with a check
 * icon, then reverts after a short delay.
 */
export default function CopyableTelegram({
  username,
}: {
  username: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!username) {
    return <div className="text-xs text-slate-400 mt-0.5">—</div>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — silently ignore.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Скопировать"
      className="group mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer transition-colors max-w-full"
    >
      <TelegramIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
      <span className="truncate">{username}</span>
      {copied ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium animate-copiedPop">
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          Скопировано
        </span>
      ) : (
        <Copy className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
