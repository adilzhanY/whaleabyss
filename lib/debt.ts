/**
 * The project's fixed debt, repaid in USDT instalments recorded in the
 * `debt_payments` table. There is exactly one debt and one creditor, so the
 * принципал lives here as a constant rather than in a table of its own — a
 * second creditor is the point at which this becomes a `debts` row instead.
 */
export const DEBT_TOTAL_USDT = 684;
export const DEBT_CREDITOR = 'Адильжан';

/** Formats an amount the way the whole /admin/debt screen prints money. */
export function formatUsdt(amount: number): string {
  return `${amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} USDT`;
}
