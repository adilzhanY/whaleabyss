/**
 * «Учебные» заказы — display-layer write-off, the DB is never touched.
 *
 * Every order created before 19.06.2026 was fulfilled, but the proceeds were
 * sent to a wrong crypto address and are gone. These orders keep their real
 * status in the DB, but:
 *  - money queries on the dashboard don't count them toward revenue;
 *  - order tables tint their rows gray (done, but we never got the money);
 *  - booster commission on them is REAL and still counts everywhere.
 */
export const LESSON_CUTOFF = new Date("2026-06-19T00:00:00+03:00");

/**
 * The site owner is on the booster roster (она берёт заказы), but her
 * commission is not a real payout — it stays in the business. She's excluded
 * from every booster-facing metric on the dashboard.
 */
export const OWNER_BOOSTER_ID = "37cc32d8-f730-4a71-bb55-a325c11d3239";

/** Row tint for written-off orders. `!` beats DataTable's hover:bg-slate-50. */
export const LESSON_ROW_CLASS = "!bg-slate-200/60";

/** True when the row should get the gray "written-off" tint. */
export function isLessonOrder(o: { createdAt: string | null }): boolean {
  if (!o.createdAt) return false;
  return new Date(o.createdAt) < LESSON_CUTOFF;
}
