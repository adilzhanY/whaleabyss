/**
 * Dashboard time window: месяц / квартал / год.
 *
 * The window is identified by an anchor month ("YYYY-MM") plus the scope, so a
 * single `?period=&anchor=` pair drives every query on /admin. Buckets differ
 * per scope — weeks inside a month, months inside a quarter or a year — which
 * is what keeps the x-axis readable at our volume (30 orders/month: a per-day
 * axis would be mostly empty).
 */

export type Period = "month" | "quarter" | "year";

export interface PeriodWindow {
  period: Period;
  /** "YYYY-MM" — the month the window is anchored on. */
  anchor: string;
  start: Date;
  end: Date;
  /** «за июль 2026» / «за III квартал 2026» / «за 2026 год» */
  suffix: string;
  /** «Июль 2026» / «III квартал 2026» / «2026 год» — stepper label. */
  label: string;
  /** «к июню 2026» — what the delta badges compare against. */
  prevLabel: string;
  /** X-axis labels, one per bucket. */
  bucketLabels: string[];
}

const MONTHS_NOM = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const MONTHS_ACC = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];
const MONTHS_DAT = [
  "январю", "февралю", "марту", "апрелю", "маю", "июню",
  "июлю", "августу", "сентябрю", "октябрю", "ноябрю", "декабрю",
];
const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];
const ROMAN = ["I", "II", "III", "IV"];

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parsePeriod(raw: string | string[] | undefined): Period {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "quarter" || value === "year" ? value : "month";
}

/** Never let the dashboard show a future window. */
export function parseAnchor(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const cur = currentMonthKey();
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return cur;
  return value <= cur ? value : cur;
}

function shift(anchor: string, months: number): string {
  const [y, m] = anchor.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Days in the given month (1-based month), e.g. 31 for July. */
export function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** How many buckets a month is split into on the dashboard chart. */
export const MONTH_BUCKETS = 8;

/**
 * Bucket index for a day of the month — the single definition both the SQL
 * (`bucketExpr` in the dashboard) and the axis labels below are derived from.
 * Splits any month into MONTH_BUCKETS near-equal slices: 4 days each in a
 * 31-day month (the last one takes the remainder), 3–4 in February.
 */
export function dayBucket(day: number, days: number) {
  return Math.min(Math.floor(((day - 1) * MONTH_BUCKETS) / days), MONTH_BUCKETS - 1);
}

/**
 * Axis labels for the month, derived by walking the days through `dayBucket`
 * so a label can never disagree with the bucket the SQL put a row in.
 */
function monthBucketLabels(y: number, m: number): string[] {
  const days = daysInMonth(y, m);
  const range: [number, number][] = [];
  for (let day = 1; day <= days; day++) {
    const i = dayBucket(day, days);
    const current = range[i];
    if (current) current[1] = day;
    else range[i] = [day, day];
  }
  return range.map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`));
}

export function buildWindow(period: Period, anchor: string): PeriodWindow {
  const [y, m] = anchor.split("-").map(Number);

  if (period === "year") {
    return {
      period,
      anchor,
      start: new Date(Date.UTC(y, 0, 1)),
      end: new Date(Date.UTC(y + 1, 0, 1)),
      suffix: `за ${y} год`,
      label: `${y} год`,
      prevLabel: `к ${y - 1} году`,
      bucketLabels: MONTHS_SHORT,
    };
  }

  if (period === "quarter") {
    const q = Math.floor((m - 1) / 3); // 0..3
    const startMonth = q * 3;
    const prevQ = q === 0 ? 3 : q - 1;
    const prevY = q === 0 ? y - 1 : y;
    return {
      period,
      anchor,
      start: new Date(Date.UTC(y, startMonth, 1)),
      end: new Date(Date.UTC(y, startMonth + 3, 1)),
      suffix: `за ${ROMAN[q]} квартал ${y}`,
      label: `${ROMAN[q]} квартал ${y}`,
      prevLabel: `к ${ROMAN[prevQ]} кварталу ${prevY}`,
      bucketLabels: [startMonth, startMonth + 1, startMonth + 2].map((i) => MONTHS_SHORT[i]),
    };
  }

  const prev = shift(anchor, -1);
  const [, prevM] = prev.split("-").map(Number);
  return {
    period,
    anchor,
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 1)),
    suffix: `за ${MONTHS_ACC[m - 1]} ${y}`,
    label: `${MONTHS_NOM[m - 1]} ${y}`,
    prevLabel: `к ${MONTHS_DAT[prevM - 1]} ${prev.split("-")[0]}`,
    bucketLabels: monthBucketLabels(y, m),
  };
}

/** The window immediately before `win` — the baseline for every delta badge. */
export function previousWindow(win: PeriodWindow): PeriodWindow {
  const size = win.period === "month" ? 1 : win.period === "quarter" ? 3 : 12;
  return buildWindow(win.period, shift(win.anchor, -size));
}

/** True when the window contains today (blocks the forward stepper). */
export function isCurrentWindow(win: PeriodWindow): boolean {
  const now = new Date();
  return now >= win.start && now < win.end;
}
