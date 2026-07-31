import data from '@/lib/questGlyphs.json';

/**
 * Symbols for quest services, on a 24×24 grid.
 *
 * They appear in two places that must agree: the region tile baked by
 * `scripts/covers/build-quest-covers.mjs` (which reads this very JSON) and the
 * live cover drawn by `components/QuestCover.tsx`. The rules are keyword-based
 * rather than random so the symbol means something — and, as a side effect,
 * nine Natlan quests stop looking like nine copies of each other.
 */
export interface QuestGlyph {
  /** Outlined paths. */
  stroke: string[];
  /** Solid paths, drawn on top. */
  fill?: string[];
}

export const QUEST_GLYPHS = data.glyphs as Record<string, QuestGlyph>;

const RULES = data.rules.map((r) => ({ re: new RegExp(r.pattern, 'i'), glyph: r.glyph }));

/** Never returns null — an unmatched name gets the plain quest marker. */
export function glyphForName(name: string): QuestGlyph {
  for (const { re, glyph } of RULES) {
    if (re.test(name)) return QUEST_GLYPHS[glyph];
  }
  return QUEST_GLYPHS.marker;
}
