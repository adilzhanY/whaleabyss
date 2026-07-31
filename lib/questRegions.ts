import regions from '@/lib/questRegions.json';

/**
 * Genshin regions a quest service can belong to.
 *
 * The palette lives in `questRegions.json` rather than in this file because the
 * cover generator (`scripts/covers/build-quest-covers.mjs`) is plain ESM and
 * reads the very same file — the colours on a generated cover and the label the
 * card prints next to it must never drift apart.
 *
 * `services.quest_region` stores one of these keys.
 */
export interface QuestRegion {
  /** Sentence case, for UI copy: «Инадзума». */
  label: string;
  /** All caps, for the artwork: «ИНАДЗУМА». */
  caps: string;
  /** Element accent — glyph, rule and glow on the cover. */
  el: string;
  /** Plate gradient (top → bottom) behind the typographic cover. */
  d1: string;
  d2: string;
}

export const QUEST_REGIONS = regions as Record<string, QuestRegion>;

export function isQuestRegion(value: unknown): value is string {
  return typeof value === 'string' && Object.hasOwn(QUEST_REGIONS, value);
}

/** «Инадзума» for a known key, `null` for anything else (legacy/unset rows). */
export function questRegionLabel(value: string | null | undefined): string | null {
  return value && isQuestRegion(value) ? QUEST_REGIONS[value].label : null;
}
