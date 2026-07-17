"use client";

import { DateField, DateRangePicker, Label, RangeCalendar } from "@heroui/react";
import { I18nProvider } from "@react-aria/i18n";
import { parseDate, type CalendarDate } from "@internationalized/date";
import { X } from "lucide-react";

/**
 * Date-range filter built on HeroUI v3's DateRangePicker.
 *
 * Controlled through the same `yyyy-mm-dd` strings the orders API takes
 * (`startDate`/`endDate` query params), so the page keeps its existing state
 * shape — this component only translates strings ⇄ CalendarDate.
 */
export default function OrderDateRangePicker({
  label,
  startDate,
  endDate,
  onChange,
}: {
  label: string;
  /** `yyyy-mm-dd` or "" (no filter). */
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}) {
  const value =
    startDate && endDate
      ? { start: safeParse(startDate), end: safeParse(endDate) }
      : null;
  const hasValue = value?.start != null && value?.end != null;

  return (
    // Pin the locale: react-aria renders date segments from the locale, and
    // SSR (en-US default) vs the browser (ru-RU) would otherwise disagree on
    // segment order — a hydration mismatch that forces React to client-render
    // the whole tree (surfacing as the layout <script> console error).
    <I18nProvider locale="ru-RU">
    <DateRangePicker
      className="w-full"
      value={hasValue ? (value as { start: CalendarDate; end: CalendarDate }) : null}
      onChange={(range) =>
        onChange(range?.start?.toString() ?? "", range?.end?.toString() ?? "")
      }
    >
      <Label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
      </Label>
      <DateField.Group fullWidth>
        <DateField.Input slot="start">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateRangePicker.RangeSeparator />
        <DateField.Input slot="end">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          {hasValue && (
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
        <RangeCalendar aria-label={label}>
          <RangeCalendar.Header>
            <RangeCalendar.YearPickerTrigger>
              <RangeCalendar.YearPickerTriggerHeading />
              <RangeCalendar.YearPickerTriggerIndicator />
            </RangeCalendar.YearPickerTrigger>
            <RangeCalendar.NavButton slot="previous" />
            <RangeCalendar.NavButton slot="next" />
          </RangeCalendar.Header>
          <RangeCalendar.Grid>
            <RangeCalendar.GridHeader>
              {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
            </RangeCalendar.GridHeader>
            <RangeCalendar.GridBody>
              {(date) => <RangeCalendar.Cell date={date} />}
            </RangeCalendar.GridBody>
          </RangeCalendar.Grid>
          <RangeCalendar.YearPickerGrid>
            <RangeCalendar.YearPickerGridBody>
              {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
            </RangeCalendar.YearPickerGridBody>
          </RangeCalendar.YearPickerGrid>
        </RangeCalendar>
      </DateRangePicker.Popover>
    </DateRangePicker>
    </I18nProvider>
  );
}

function safeParse(s: string): CalendarDate | null {
  try {
    return parseDate(s);
  } catch {
    return null;
  }
}
