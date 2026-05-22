/**
 * Shared admin dashboard time-range constants. Kept in its own non-client
 * module so the server component (app/admin/page.tsx) can import them
 * alongside the client TimeRangeSelect.
 */
export const TIME_RANGE_OPTIONS = [
  { value: "1d", label: "За 1 день" },
  { value: "3d", label: "За 3 дня" },
  { value: "7d", label: "За 7 дней" },
  { value: "1m", label: "За месяц" },
  { value: "6m", label: "За полгода" },
  { value: "1y", label: "За год" },
  { value: "all", label: "За всё время" },
] as const;

export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number]["value"];
