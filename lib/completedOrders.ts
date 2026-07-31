/**
 * The public «выполненных заказов» figure. Its own module (not lib/siteStats)
 * because client components render it, and siteStats imports the db driver —
 * pulling that into a browser bundle is a build error.
 */

/**
 * Orders fulfilled BEFORE the site existed (the VK/Telegram era), stated by
 * the owner as «больше 200 всего» while the DB held 76 real completed orders —
 * hence 124, the smallest legacy count that statement implies. Deliberately
 * the conservative bound: with it, `displayCompletedOrders` can only ever
 * UNDERstate, so every future «N+» stays provably true as the live count grows.
 */
const PRE_SITE_COMPLETED_ORDERS = 124;

/**
 * Live completed + pre-site legacy, floored to a round «N+» (207 → «200+»,
 * 262 → «250+»). Keeps growing on its own — no one has to remember to bump a
 * hardcoded number. Used by the homepage trust strip and /info; always a round
 * fifty, so the genitive «заказов» is always the right plural.
 */
export function displayCompletedOrders(liveCompleted: number): string {
  const total = liveCompleted + PRE_SITE_COMPLETED_ORDERS;
  return `${Math.floor(total / 50) * 50}+`;
}
