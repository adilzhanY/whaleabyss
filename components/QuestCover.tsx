import { QUEST_REGIONS } from "@/lib/questRegions";
import { glyphForName } from "@/lib/questGlyphs";

interface QuestCoverProps {
  /** Key from `lib/questRegions.json`, i.e. `services.quest_region`. */
  region: string;
  /** The quest name — on this cover the name IS the artwork. */
  name: string;
}

/**
 * Typographic cover for a quest service, drawn live in the catalogue card.
 *
 * It used to be a generated 1200×750 image. That could not work: the card's
 * picture box is a fixed height at a fluid width, so its aspect ratio changes
 * with every breakpoint and column count — `background-size: cover` then ate the
 * sides of the name («Угроза во тьме» → «оза во тьме» on a 5-column desktop grid,
 * while the 2-column phone layout looked right). Exporting one image per shape is
 * a losing game; real text in a container query fits every shape by construction,
 * and is sharper and lighter besides.
 *
 * The photographic region tile stays a real file (`services.image_url`) — the
 * cart, orders, admin, the /service hero, Telegram and e-mail all need a URL,
 * and its lockup is centred, so cropping treats it symmetrically.
 *
 * Sizes are in `cqi` (1% of the box width), so the type scales with the card
 * instead of with the viewport: the same component reads correctly in a 2-column
 * phone grid and a 6-column desktop one. Top-left and top-right are left empty on
 * purpose — the discount ribbon and the «Хит» chip live there.
 */
/** Four type steps by name length — see the `[data-size]` rules in globals.css. */
function sizeStep(name: string): "lg" | "md" | "sm" | "xs" {
  if (name.length <= 16) return "lg";
  if (name.length <= 30) return "md";
  if (name.length <= 46) return "sm";
  return "xs";
}

export default function QuestCover({ region, name }: QuestCoverProps) {
  const r = QUEST_REGIONS[region];
  if (!r) return null;
  const glyph = glyphForName(name);

  return (
    <div
      className="quest-cover"
      data-size={sizeStep(name)}
      style={{ ["--el" as string]: r.el, ["--d1" as string]: r.d1, ["--d2" as string]: r.d2 }}
    >
      <svg className="quest-cover__watermark" viewBox="0 0 24 24" aria-hidden focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round">
          {glyph.stroke.map((d) => <path key={d} d={d} />)}
        </g>
        {glyph.fill?.map((d) => <path key={d} d={d} fill="currentColor" />)}
      </svg>
      {/* No region wordmark here on purpose: the card prints «Инадзума · задание»
          directly under this box, and the two would repeat each other 20px apart.
          The plate colour carries the region; the caption names it. */}
      <p className="quest-cover__name">{name}</p>
    </div>
  );
}
