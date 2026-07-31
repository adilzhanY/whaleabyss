"use client";

import { useContext } from "react";
import { DateField, DateRangePicker, Label, RangeCalendar } from "@heroui/react";
import { I18nProvider, useDateFormatter } from "@react-aria/i18n";
import { RangeCalendarStateContext } from "react-aria-components";
import { parseDate, type CalendarDate } from "@internationalized/date";
import { X } from "lucide-react";

export interface CustomDateRangePickerProps {
  /** Rendered above the field. Omit when the caller draws its own label. */
  label?: string;
  /** `yyyy-mm-dd` or "" (nothing selected). */
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  /** Earliest selectable day, `yyyy-mm-dd`. Days before it are disabled. */
  minDate?: string;
  /** Latest selectable day, `yyyy-mm-dd`. */
  maxDate?: string;
  /**
   * `sm` (default) - admin toolbar height.
   * `md` - matches `CustomInput`/`CustomSearchField` `md` on the public site.
   */
  fieldSize?: "sm" | "md";
  /**
   * Months shown side by side in the calendar (stacked on narrow screens).
   * Use 2 when `minDate` is ~today and the range runs forward: near the end of
   * a month the single-month view is a wall of disabled days with one or two
   * clickable cells, which reads as "nothing else can be chosen" — showing the
   * next month makes the open future visible instead of hiding it behind the
   * nav arrow.
   */
  months?: 1 | 2;
  /** Show the reset (X) button. Off for required ranges. */
  clearable?: boolean;
  className?: string;
  labelClassName?: string;
}

/**
 * Site-wide date range picker, built on HeroUI v3's DateRangePicker.
 *
 * Controlled with the same `yyyy-mm-dd` strings the rest of the app uses
 * (order query params, `order_items.startDate/endDate`), so callers keep their
 * existing state shape - this only translates strings ⇄ CalendarDate.
 *
 * The look lives in the `.custom-date-range-picker` block in globals.css and
 * covers admin-dark and the public site-dark theme.
 */
export default function CustomDateRangePicker({
  label,
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  fieldSize = "sm",
  months = 1,
  clearable = true,
  className = "",
  labelClassName = "block text-xs font-semibold text-slate-600",
}: CustomDateRangePickerProps) {
  const start = safeParse(startDate);
  const end = safeParse(endDate);
  const hasValue = start != null && end != null;
  const min = safeParse(minDate) ?? undefined;
  const max = safeParse(maxDate) ?? undefined;

  return (
    // Pin the locale: react-aria renders date segments from the locale, and
    // SSR (en-US default) vs the browser (ru-RU) would otherwise disagree on
    // segment order — a hydration mismatch that forces React to client-render
    // the whole tree (surfacing as the layout <script> console error).
    <I18nProvider locale="ru-RU">
      <div
        className={`custom-date-range-picker custom-date-range-picker--${fieldSize} ${className}`}
      >
        <DateRangePicker
          className="w-full"
          value={hasValue ? { start, end } : null}
          minValue={min}
          maxValue={max}
          onChange={(range) =>
            onChange(range?.start?.toString() ?? "", range?.end?.toString() ?? "")
          }
        >
          {label && <Label className={labelClassName}>{label}</Label>}
          <DateField.Group fullWidth>
            <DateField.Input slot="start">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator />
            <DateField.Input slot="end">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              {clearable && hasValue && (
                <button
                  type="button"
                  title="Сбросить"
                  onClick={() => onChange("", "")}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <DateRangePicker.Trigger>
                <DateRangePicker.TriggerIndicator />
              </DateRangePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DateRangePicker.Popover>
            {/* minValue/maxValue must be repeated here: HeroUI takes the
                calendar as an explicit child, so the picker's own bounds do
                not reach it and every past day stays clickable. */}
            <RangeCalendar
              aria-label={label ?? "Выбор периода"}
              minValue={min}
              maxValue={max}
              visibleDuration={{ months }}
              // Default paging advances by the whole visible span (2 months a
              // click, июль → сентябрь) — disorienting. One month at a time.
              pageBehavior="single"
              className={months > 1 ? "range-calendar--multi" : undefined}
            >
              <RangeCalendar.Header>
                {/* Multi-month: each grid captions itself below; the shared
                    heading slot would only ever name the first month. */}
                {months === 1 && (
                  <RangeCalendar.YearPickerTrigger>
                    <RangeCalendar.YearPickerTriggerHeading />
                    <RangeCalendar.YearPickerTriggerIndicator />
                  </RangeCalendar.YearPickerTrigger>
                )}
                <RangeCalendar.NavButton slot="previous" />
                <RangeCalendar.NavButton slot="next" />
              </RangeCalendar.Header>
              <div className="range-calendar__months">
                {Array.from({ length: months }, (_, i) => (
                  <div key={i}>
                    {months > 1 && <MonthCaption offset={i} />}
                    <RangeCalendar.Grid offset={{ months: i }}>
                      <RangeCalendar.GridHeader>
                        {(day) => (
                          <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                        )}
                      </RangeCalendar.GridHeader>
                      <RangeCalendar.GridBody>
                        {(date) => <RangeCalendar.Cell date={date} />}
                      </RangeCalendar.GridBody>
                    </RangeCalendar.Grid>
                  </div>
                ))}
              </div>
              {months === 1 && (
                <RangeCalendar.YearPickerGrid>
                  <RangeCalendar.YearPickerGridBody>
                    {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
                  </RangeCalendar.YearPickerGridBody>
                </RangeCalendar.YearPickerGrid>
              )}
            </RangeCalendar>
          </DateRangePicker.Popover>
        </DateRangePicker>
      </div>
    </I18nProvider>
  );
}

function safeParse(s?: string): CalendarDate | null {
  if (!s) return null;
  try {
    return parseDate(s);
  } catch {
    return null;
  }
}

/**
 * «июль 2026 г.» caption above one grid of a multi-month calendar. The shared
 * heading only ever names the FIRST visible month, which reads as wrong next
 * to the second grid — so each month labels itself. Must render inside
 * `<RangeCalendar>` (it reads the calendar state from context).
 */
function MonthCaption({ offset }: { offset: number }) {
  const state = useContext(RangeCalendarStateContext);
  const formatter = useDateFormatter({ month: "long", year: "numeric" });
  if (!state) return null;
  const month = state.visibleRange.start.add({ months: offset });
  return (
    <div className="range-calendar__month-caption" aria-hidden>
      {formatter.format(month.toDate(state.timeZone))}
    </div>
  );
}
