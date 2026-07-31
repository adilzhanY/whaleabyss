"use client";

import React from "react";

/**
 * Card shell for the user cockpit: a tight header strip (title + optional
 * right-hand slot) over the body. Deliberately smaller than the site cards —
 * this is a dense admin surface, not a landing page.
 */
export default function UserCard({
  title,
  right,
  children,
  className = "",
  bodyClassName = "p-4",
  tone = "default",
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** `warn` tints the header — used for the live cart, which is a to-do. */
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`bg-white rounded-xl border ${
        tone === "warn" ? "border-amber-200" : "border-slate-200"
      } ${className}`}
    >
      <div
        className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b ${
          tone === "warn"
            ? "border-amber-200 bg-amber-50 rounded-t-xl"
            : "border-slate-100"
        }`}
      >
        <h3 className="text-[13px] font-bold text-slate-900">{title}</h3>
        {right && <div className="text-xs text-slate-500 shrink-0">{right}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/**
 * Empty state for a section that has no rows. One line, not a 200px void —
 * 78% of accounts have no orders, so this is the DEFAULT rendering of half
 * the page and must not dominate it.
 */
export function EmptyRow({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-500">
      <span>{children}</span>
      {action}
    </div>
  );
}
