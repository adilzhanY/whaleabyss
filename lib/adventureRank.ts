// Adventure Rank (Ранг приключений) gating.
//
// Some services can only be performed once the account has reached a minimum
// Adventure Rank. That requirement is written into the service `description`
// in Russian, in a handful of phrasings, e.g.:
//   "Исследование территорий доступно с 20 ранга."
//   "Услуга доступна с 28 ранга."
//   "Доступно с 45 ранга при наличии на аккаунте ..."
//
// The description is the single source of truth — admins edit it directly and
// the gate follows automatically (no separate DB column to keep in sync). Both
// the client add-to-cart gate and the server-side checkout gate parse it with
// this helper so they always agree.

// "доступн(о|а|ы) с N ранг…" — tolerant of the word ending (доступно/доступна)
// and the case of "ранг" (ранга/ранге). Ranks are 1–60, so 1–2 digits.
const MIN_AR_RE = /доступн[оаы]?\s+с\s+(\d{1,2})\s+ранг/i;

/**
 * Extract the minimum Adventure Rank a service requires from its description.
 * Returns the rank (1–60) or null when the description carries no such gate.
 */
export function parseMinAdventureRank(description?: string | null): number | null {
  if (!description) return null;
  const match = description.match(MIN_AR_RE);
  if (!match) return null;
  const rank = Number.parseInt(match[1], 10);
  if (!Number.isFinite(rank) || rank < 1 || rank > 60) return null;
  return rank;
}
