"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export type ReviewStatus = "pending" | "approved" | "rejected";

const BADGE_STYLES: Record<ReviewStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
};

const BADGE_LABELS: Record<ReviewStatus, string> = {
  pending: "На модерации",
  approved: "Одобрен",
  rejected: "Отклонён",
};

const MENU_OPTIONS: { value: ReviewStatus; label: string; itemClass: string }[] = [
  { value: "approved", label: "Одобрить", itemClass: "hover:bg-green-50 text-green-700" },
  { value: "pending", label: "На модерацию", itemClass: "hover:bg-yellow-50 text-yellow-700" },
  { value: "rejected", label: "Отклонить", itemClass: "hover:bg-red-50 text-red-700" },
];

/** Rough rendered height of the menu (3 items) — used to flip it above the
 *  badge when there isn't room below in the viewport. */
const MENU_HEIGHT = 104;

/**
 * Inline review-status badge with a hover dropdown to change the status straight
 * from the reviews table.
 *
 * The menu is rendered through a portal with `position: fixed` rather than as an
 * absolutely-positioned child. Inside the table it would otherwise live in the
 * `overflow-x-auto` wrapper (which forces `overflow-y: auto` too), and the menus
 * hanging below the bottom rows would extend the wrapper's scrollable region —
 * giving the reviews table a phantom vertical scrollbar even when idle. Same fix
 * as {@link OrderStatusCell}.
 */
export default function ReviewStatusCell({
  status,
  onChange,
}: {
  status: ReviewStatus;
  onChange: (newStatus: ReviewStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    flip: boolean;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const openMenu = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const flip = r.bottom + MENU_HEIGHT > window.innerHeight;
    setCoords({
      top: flip ? r.top - 4 : r.bottom + 4,
      left: r.left,
      flip,
    });
    setOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  // The fixed-position menu would drift if the page scrolls/resizes while open,
  // so just close it (hover menus are transient anyway).
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const select = (newStatus: ReviewStatus) => {
    setOpen(false);
    onChange(newStatus);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={btnRef}
        type="button"
        className={`px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${BADGE_STYLES[status]}`}
      >
        {BADGE_LABELS[status]}
      </button>

      {mounted &&
        open &&
        coords &&
        createPortal(
          <div
            onMouseEnter={() => {
              if (closeTimer.current) clearTimeout(closeTimer.current);
            }}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: coords.flip ? "translateY(-100%)" : undefined,
            }}
            className="bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-[100] whitespace-nowrap"
          >
            {MENU_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  select(opt.value);
                }}
                className={`block w-full px-3 py-1.5 text-left text-xs ${opt.itemClass}`}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
