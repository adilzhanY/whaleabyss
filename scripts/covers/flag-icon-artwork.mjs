/**
 * Which service artwork must be shown WHOLE instead of cropped to fill.
 *
 * Most artwork is a wide screenshot, and cropping it to the card's box is right.
 * A minority is a square item icon on flat white («Прочее», «Задание легенд»,
 * «Задание Архонтов»): the card's picture box is nearly square on a 5-column
 * grid, so its edges cut straight through the icon. Those services get
 * `services.image_fit = 'contain'`, and the card then draws them via
 * `components/ServiceArtwork.tsx`.
 *
 * The test is on the picture itself, not on a hand-kept list: an image is an
 * icon when it is (near enough) square AND its outer frame is one flat colour or
 * transparent. A photograph never has both.
 *
 * Usage:
 *   node scripts/covers/flag-icon-artwork.mjs            # classify and print
 *   node scripts/covers/flag-icon-artwork.mjs --publish  # write services.image_fit
 *
 * Re-run it after uploading new artwork; it is idempotent and only writes rows
 * whose flag actually changes.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import sharp from 'sharp';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CACHE = path.join(HERE, 'out', '_art');
const PUBLISH = process.argv.includes('--publish');

/** Square within 12%, and an outer frame that is mostly ONE colour (or clear).
 *
 * Deliberately not the stddev of the frame: «Улучшение персонажа» is an icon on
 * white whose artwork touches the edge, and a handful of dark pixels there drags
 * the deviation up to 36 — the picture is still 90% flat white and still gets
 * beheaded by a crop. Share-near-the-dominant-colour reads that correctly, and
 * the squareness gate keeps wide screenshots out regardless. */
const SQUARE_TOLERANCE = 0.12;
const DOMINANT_SHARE = 0.7;
const COLOUR_DISTANCE = 44;

async function classify(file) {
  const meta = await sharp(file).metadata();
  const ratio = meta.width / meta.height;
  const square = Math.abs(ratio - 1) <= SQUARE_TOLERANCE;

  // Sample a 3%-wide frame on a normalised 120×120 copy, so the cost does not
  // depend on the source being 128px or 3840px.
  const { data, info } = await sharp(file)
    .resize(120, 120, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const frame = [];
  for (let y = 0; y < 120; y++) {
    for (let x = 0; x < 120; x++) {
      if (x > 3 && x < 116 && y > 3 && y < 116) continue;
      const i = (y * 120 + x) * info.channels;
      frame.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
    }
  }
  const n = frame.length;
  const clear = frame.filter((p) => p[3] < 16);

  // Dominant colour of the opaque part of the frame, via 32-level buckets.
  const buckets = new Map();
  for (const p of frame) {
    if (p[3] < 16) continue;
    const key = `${p[0] >> 5}|${p[1] >> 5}|${p[2] >> 5}`;
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n += 1; b.r += p[0]; b.g += p[1]; b.b += p[2];
    buckets.set(key, b);
  }
  let top = null;
  for (const b of buckets.values()) if (!top || b.n > top.n) top = b;
  const dominant = top ? [top.r / top.n, top.g / top.n, top.b / top.n] : [0, 0, 0];

  const near = frame.filter((p) => {
    if (p[3] < 16) return true; // transparent counts as background
    return Math.hypot(p[0] - dominant[0], p[1] - dominant[1], p[2] - dominant[2]) <= COLOUR_DISTANCE;
  }).length;
  const share = near / n;

  return {
    fit: square && share >= DOMINANT_SHARE ? 'contain' : null,
    size: `${meta.width}×${meta.height}`,
    ratio,
    share,
    clear: clear.length / n,
  };
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL.replace(/"/g, '') });
await client.connect();

const { rows } = await client.query(`
  SELECT s.id, s.slug, s.image_url, s.image_fit, c.slug AS category
  FROM services s
  JOIN categories c ON c.id = s.category_id
  WHERE s.image_url IS NOT NULL AND s.image_url <> '' AND s.is_test_service = false
  ORDER BY c.slug, s.slug
`);

fs.mkdirSync(CACHE, { recursive: true });
const changes = [];
for (const row of rows) {
  const file = path.join(CACHE, path.basename(new URL(row.image_url).pathname));
  if (!fs.existsSync(file)) {
    const res = await fetch(row.image_url);
    if (!res.ok) { console.error(`  ! ${row.slug}: HTTP ${res.status}`); continue; }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const r = await classify(file);
  const current = row.image_fit ?? null;
  if (r.fit !== current) changes.push({ ...row, ...r, current });
  if (r.fit === 'contain') {
    console.log(`  целиком  ${row.category.padEnd(10)} ${row.slug.padEnd(38)} ${r.size} (фон занимает ${(r.share * 100).toFixed(0)}% рамки)`);
  }
}

console.log(`\nВсего услуг с артом: ${rows.length}`);
console.log(`Показывать целиком: ${rows.filter((r) => r.image_fit === 'contain').length} сейчас в базе`);
if (!changes.length) {
  console.log('Изменений нет.');
} else {
  console.log(`\nИзменится ${changes.length}:`);
  for (const c of changes) console.log(`  ${c.slug}: ${c.current ?? 'обрезать'} → ${c.fit ?? 'обрезать'}`);
  if (PUBLISH) {
    for (const c of changes) {
      await client.query('UPDATE services SET image_fit = $1, updated_at = now() WHERE id = $2', [c.fit, c.id]);
    }
    console.log('\nЗаписано в базу.');
  } else {
    console.log('\nБаза не тронута. Записать: --publish');
  }
}

await client.end();
