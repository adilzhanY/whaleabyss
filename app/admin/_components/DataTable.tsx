"use client";

import React from "react";

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
}: DataTableProps<T>) {
  const padX = dense ? "px-2" : "px-4";
  const paginated = typeof pageSize === "number" && pageSize > 0;
  const totalPages = paginated ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = paginated ? (currentPage - 1) * pageSize : 0;
  const rows = paginated ? data.slice(startIndex, startIndex + pageSize) : data;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Desktop: real table. `table-auto w-full` sizes columns to fit the
            card, so the horizontal scrollbar only appears on genuinely narrow
            viewports — no empty scrollbar strip pinned to the card footer. */}
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm table-auto">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    `font-medium ${padX} py-3`,
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
              return (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    "border-t border-slate-100 transition-colors hover:bg-slate-50",
                    onRowClick ? "cursor-pointer" : "",
                    rowClassName?.(row) ?? "",
                  ].join(" ")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        `${padX} py-3 align-top`,
                        alignClass[col.align ?? "left"],
                        col.cellClassName ?? "",
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
        <div className="md:hidden divide-y divide-slate-100">
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
      </div>

      {paginated && onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Страница {currentPage} из {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <button
                onClick={() => onPageChange(currentPage - 1)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-full font-semibold hover:bg-slate-300 transition-colors"
              >
                Назад
              </button>
            )}
            {currentPage < totalPages && (
              <button
                onClick={() => onPageChange(currentPage + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
              >
                Следующая
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
