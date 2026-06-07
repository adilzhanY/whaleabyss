"use client";

import TelegramIcon from "@/components/TelegramIcon";
import CopyableText from "./CopyableText";

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
  if (!username) {
    return <div className="text-xs text-slate-400 mt-0.5">—</div>;
  }

  return (
    <CopyableText
      value={username}
      className="mt-0.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
    >
      <TelegramIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
      <span className="truncate">{username}</span>
    </CopyableText>
  );
}
