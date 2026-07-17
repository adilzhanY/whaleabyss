"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Column definition for {@link DataTable}.
 *
 * The same column drives two renderings: the desktop `<table>` and the mobile
 * stacked card. `render` is shared; the mobile-only knobs (`mobileLabel`,
 * `hideOnMobile`, `mobileFullWidth`) tune how the value is laid out on phones.
 */
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** `index` is the row's GLOBAL index in `data` (survives pagination) — use it for the № column. */
  render: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** Desktop width utility, e.g. "w-12". Ignored on mobile. */
  width?: string;
  cellClassName?: string;
  headerClassName?: string;
  /** Label shown in the mobile stacked card. Defaults to `header`. */
  mobileLabel?: React.ReactNode;
  /** Drop this column from the mobile card entirely. */
  hideOnMobile?: boolean;
  /** Render full-width on mobile with no label column (e.g. positions list, review text). */
  mobileFullWidth?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  /** Full (already-filtered) dataset. DataTable slices it for the current page. */
  data: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  /** Controlled pagination. Omit `pageSize` to show everything without a footer. */
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  /** Tighter horizontal cell padding to fit more columns without horizontal scroll. */
  dense?: boolean;
  /**
   * Server-pagination mode. When set, `data` is treated as the CURRENT page's
   * rows (already sliced in SQL) and this is the total row count across all
   * pages — the table renders `data` as-is and paginates against this number.
   * Omit for the default client-side slicing of the full `data` array.
   */
  totalCount?: number;
}

const alignClass: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export default function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  emptyMessage = "Ничего не найдено",
  onRowClick,
  rowClassName,
  page = 1,
  pageSize,
  onPageChange,
  dense = false,
  totalCount,
}: DataTableProps<T>) {
  const padX = dense ? "px-2" : "px-4";
  const serverPaginated = typeof totalCount === "number";
  const paginated = typeof pageSize === "number" && pageSize > 0;
  const rowCount = serverPaginated ? totalCount : data.length;
  const totalPages = paginated ? Math.max(1, Math.ceil(rowCount / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = paginated ? (currentPage - 1) * pageSize : 0;
  // Server mode: `data` is already this page's rows; don't slice again.
  const rows = serverPaginated
    ? data
    : paginated
      ? data.slice(startIndex, startIndex + pageSize)
      : data;

  if (loading) {
    return (
      <div className="bg-slate-200/60 rounded-[20px] border border-slate-200 p-2">
        <div className="bg-white rounded-xl flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-slate-200/60 rounded-[20px] border border-slate-200 p-2">
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-slate-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  const rangeStart = rowCount === 0 ? 0 : startIndex + 1;
  const rangeEnd = paginated ? Math.min(startIndex + pageSize, rowCount) : rowCount;

  return (
    // Concentric "hugging" corners: the gray frame's radius (20px) = inner
    // card radius (12px) + frame padding (8px), so the corners stay parallel.
    <div className="bg-slate-200/60 rounded-[20px] border border-slate-200 p-2">
      {/* Desktop: real table. The header row sits directly on the gray frame;
          the white "card" is formed by the body cells themselves (corner cells
          carry the radius), matching the reference design. */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm table-auto border-separate border-spacing-0">
          <thead>
            <tr className="text-slate-500 text-[13px]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    `font-medium ${padX} pt-1 pb-1.5 leading-tight`,
                    alignClass[col.align ?? "left"],
                    col.width ?? "",
                    col.headerClassName ?? "",
                  ].join(" ")}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const globalIndex = startIndex + i;
              const isFirstRow = i === 0;
              const isLastRow = i === rows.length - 1;
              return (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={["group", onRowClick ? "cursor-pointer" : ""].join(" ")}
                >
                  {columns.map((col, ci) => (
                    <td
                      key={col.key}
                      className={[
                        `${padX} py-3 align-top`,
                        "bg-white transition-colors group-hover:bg-slate-50",
                        alignClass[col.align ?? "left"],
                        isFirstRow ? "" : "border-t border-slate-100",
                        isFirstRow && ci === 0 ? "rounded-tl-xl" : "",
                        isFirstRow && ci === columns.length - 1 ? "rounded-tr-xl" : "",
                        isLastRow && ci === 0 ? "rounded-bl-xl" : "",
                        isLastRow && ci === columns.length - 1 ? "rounded-br-xl" : "",
                        col.cellClassName ?? "",
                        // Row tints (e.g. lesson orders' !bg-…) must live on the
                        // cells now — an opaque cell bg would hide a tr-level bg.
                        rowClassName?.(row) ?? "",
                      ].join(" ")}
                    >
                      {col.render(row, globalIndex)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: each row becomes a stacked label→value card — no horizontal scroll. */}
      <div className="md:hidden bg-white rounded-xl overflow-hidden divide-y divide-slate-100">
        {rows.map((row, i) => {
          const globalIndex = startIndex + i;
          return (
            <div
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={[
                "p-4 space-y-2 transition-colors",
                onRowClick ? "cursor-pointer active:bg-slate-50" : "",
                rowClassName?.(row) ?? "",
              ].join(" ")}
            >
              {mobileColumns.map((col) =>
                col.mobileFullWidth ? (
                  <div key={col.key} className="min-w-0">
                    {col.render(row, globalIndex)}
                  </div>
                ) : (
                  <div
                    key={col.key}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="text-xs font-medium text-slate-500 shrink-0 pt-0.5">
                      {col.mobileLabel ?? col.header}
                    </span>
                    <span className="min-w-0 text-right">
                      {col.render(row, globalIndex)}
                    </span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Footer lives on the frame itself, like the reference design. */}
      {paginated && (
        <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1 min-h-[40px]">
          <span className="text-sm text-slate-500">
            {rangeStart}–{rangeEnd} из {rowCount}
          </span>

          {onPageChange && totalPages > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 pl-1.5 pr-2.5 h-8 rounded-full text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white/70 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.25} />
                Назад
              </button>

              {pageItems(currentPage, totalPages).map((it, i) =>
                it === "…" ? (
                  <span key={`gap-${i}`} className="w-8 text-center text-sm text-slate-400 select-none">
                    …
                  </span>
                ) : (
                  <button
                    key={it}
                    onClick={() => onPageChange(it)}
                    className={[
                      "w-8 h-8 rounded-full text-sm font-medium transition-colors",
                      it === currentPage
                        ? "bg-white text-slate-900"
                        : "text-slate-500 hover:text-slate-900 hover:bg-white/70",
                    ].join(" ")}
                  >
                    {it}
                  </button>
                )
              )}

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 pl-2.5 pr-1.5 h-8 rounded-full text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-white/70 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Вперёд
                <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Windowed page list: 1 … around current … last (all pages when ≤ 7). */
function pageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = [1, current - 1, current, current + 1, total]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of wanted) {
    if (p === prev) continue;
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}
