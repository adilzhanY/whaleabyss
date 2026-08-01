/**
 * The public «выполненных заказов» figure. Its own module (not lib/siteStats)
 * because client components render it, and siteStats imports the db driver —
 * pulling that into a browser bundle is a build error.
 */

/**
 * Marketing floor, stated by the owner on 2026-08-01 (revised the same day
 * from 500 down to 300): never show less than «300+». It stands in for the
 * VK/Telegram-era orders that never entered the DB (earlier this module
 * carried them as a `PRE_SITE_COMPLETED_ORDERS = 124` addend — the floor
 * replaces that entirely, per the owner's rule below).
 */
const OWNER_STATED_MINIMUM = 300;

/**
 * The owner's rule, verbatim: the DB count of completed orders, floored to a
 * round fifty — «table hits 350 → show 350+, hits 400 → 400+» — but never
 * below the stated floor. Keeps growing on its own; no one has to remember to
 * bump a hardcoded number. Used by the homepage trust strip and /info; always
 * a round fifty, so the genitive «заказов» is always the right plural.
 */
export function displayCompletedOrders(liveCompleted: number): string {
  return `${Math.max(Math.floor(liveCompleted / 50) * 50, OWNER_STATED_MINIMUM)}+`;
}

/**
 * Same step-of-50 counter for reviews («161» → «150+»), no artificial floor —
 * the table genuinely holds that many. Returns null under 50 so callers hide
 * the count instead of showing a silly «0+»/«50+» overstatement.
 */
export function displayReviewCount(liveCount: number): string | null {
  if (liveCount < 50) return null;
  return `${Math.floor(liveCount / 50) * 50}+`;
}
