/**
 * Quest tiles — generator.
 *
 * Quest services have no artwork of their own (there is nothing to screenshot),
 * so each one gets a tile built from data we already have: the art of the region
 * it belongs to, darkened, with a symbol picked from its name and the region's
 * name set across it. The tile lands in `services.image_url`, which is what
 * every surface that needs a URL already reads — /cart, the cart drawer,
 * /orders, /admin/services, the /service/[slug] hero, Telegram, e-mail.
 *
 * The big catalogue card does NOT use it: `components/QuestCover.tsx` draws a
 * typographic cover live instead, because that box is a fixed height at a fluid
 * width and no single exported image survives every aspect ratio.
 *
 * The region comes from `service_addons`: a quest is linked to the exploration
 * service it gates («ФОНТЕЙН 4.2» → «Цепочка Ордо»). It is resolved once here
 * and stored in `services.quest_region`, so unlinking an addon later cannot
 * silently change the artwork — and the card reads the same key to pick its
 * palette.
 *
 * Usage:
 *   node scripts/covers/build-quest-covers.mjs             # write to scripts/covers/out/ + contact sheet
 *   node scripts/covers/build-quest-covers.mjs --only=slug,slug
 *   node scripts/covers/build-quest-covers.mjs --publish   # upload to S3 and write the DB columns
 *
 * Nothing is uploaded and no row is touched without --publish.
 */
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import REGIONS from '../../lib/questRegions.json' with { type: 'json' };
import GLYPH_DATA from '../../lib/questGlyphs.json' with { type: 'json' };

/* ── Onest for librsvg ──────────────────────────────────────────────────────
 * sharp renders SVG text through librsvg → fontconfig, which only sees fonts
 * installed on the machine. Rather than dropping a font into the user's
 * ~/.local/share/fonts, point fontconfig at our own copy for this process only.
 * MUST happen before sharp is imported, hence the dynamic import below. */
const HERE = path.dirname(new URL(import.meta.url).pathname);
const FONT_DIR = path.join(HERE, 'fonts');
if (!fs.existsSync(path.join(FONT_DIR, 'Onest-Variable.ttf'))) {
  console.error(`Missing ${path.join(FONT_DIR, 'Onest-Variable.ttf')} — see scripts/covers/README.md`);
  process.exit(1);
}
const FC_FILE = path.join(os.tmpdir(), 'whaleabyss-fonts.conf');
fs.writeFileSync(
  FC_FILE,
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>
  <dir>${FONT_DIR}</dir>
  <cachedir>${path.join(os.tmpdir(), 'whaleabyss-fc-cache')}</cachedir>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
</fontconfig>`,
);
process.env.FONTCONFIG_FILE = FC_FILE;
const { default: sharp } = await import('sharp');

/* ── constants ────────────────────────────────────────────────────────────── */
const W = 1200;
const H = 750; // 16:10, matching the /service/[slug] hero
const OUT = path.join(HERE, 'out');
const ART_CACHE = path.join(OUT, '_art');
const BUCKET = 'whaleabyss-bucket';
const CDN = `https://storage.yandexcloud.net/${BUCKET}/`;

const argv = process.argv.slice(2);
const PUBLISH = argv.includes('--publish');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '')
  .split(',').filter(Boolean);

/* ── region resolution ────────────────────────────────────────────────────── */
/** Parent (exploration) service title → region key. First match wins, so the
 *  more specific sub-regions must come before the bare region names. */
const REGION_PATTERNS = [
  [/ДРАКОНИЙ ХРЕБЕТ/i, 'dragonspine'],
  [/ДОЛИНА ЧЭНЬЮЙ|ЛИ ЮЭ/i, 'liyue'],
  [/РАЗЛОМ/i, 'chasm'],
  [/ЭНКАНОМИЯ/i, 'enkanomiya'],
  [/ИНАДЗУМА/i, 'inazuma'],
  [/СУМЕРУ/i, 'sumeru'],
  [/ФОНТЕЙН/i, 'fontaine'],
  [/НАТЛАН/i, 'natlan'],
  [/НОД-КРАЙ/i, 'nodkrai'],
  [/МОНДШТАДТ/i, 'mondstadt'],
];

/** Quests with no addon link at all — the only place a human decides anything. */
const MANUAL = {
  'zapisi-o-puteshestvii-vglub-razloma': { region: 'chasm', artFrom: /^РАЗЛОМ/i },
};

function regionFromParent(title) {
  if (!title) return null;
  for (const [re, key] of REGION_PATTERNS) if (re.test(title)) return key;
  return null;
}

/* ── glyphs ───────────────────────────────────────────────────────────────── */
// Shared with the live cover (lib/questGlyphs.ts) so the tile and the card can
// never disagree about which symbol a quest has.
const GLYPH_RULES = GLYPH_DATA.rules.map((r) => ({ re: new RegExp(r.pattern, 'i'), glyph: r.glyph }));

function glyphKeyFor(name) {
  for (const { re, glyph } of GLYPH_RULES) if (re.test(name)) return glyph;
  return 'marker';
}

function glyphSvg(key, colour, x, y, size, strokeWidth = 1.6) {
  const g = GLYPH_DATA.glyphs[key];
  const outlined = g.stroke.map((d) => `<path d="${d}"/>`).join('');
  const solid = (g.fill ?? []).map((d) => `<path d="${d}" fill="${colour}" stroke="none"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${colour}"
    stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round">${outlined}${solid}</g>`;
}

/** Nine framings of the same region art, picked deterministically per quest so
 *  the choice never changes between runs — this is what stops nine Natlan
 *  quests from being nine identical pictures. */
const CROPS = ['centre', 'top', 'bottom', 'left', 'right',
  'left top', 'right top', 'left bottom', 'right bottom'];

function hashOf(str) {
  return parseInt(crypto.createHash('sha1').update(str).digest('hex').slice(0, 8), 16);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── the tile ─────────────────────────────────────────────────────────────── */
async function buildTile(quest, art) {
  const r = REGIONS[quest.region];
  const crop = CROPS[hashOf(quest.slug) % CROPS.length];

  // The lockup has to stay legible over whatever the art happens to be — a
  // bright Fontaine waterfall or a dark Chasm gorge — so contrast is built in
  // three layers instead of trusting the photo: the art itself is dimmed and
  // desaturated, a vertical veil sits on top, and a soft dark pool sits directly
  // behind the text. The glyph is white for the same reason; the element colour
  // lives on the rule, where nothing depends on reading it.
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#03070f" stop-opacity="0.58"/>
        <stop offset="55%" stop-color="#03070f" stop-opacity="0.50"/>
        <stop offset="100%" stop-color="#03070f" stop-opacity="0.76"/>
      </linearGradient>
      <radialGradient id="focus" cx="50%" cy="50%" r="48%">
        <stop offset="0%" stop-color="#03070f" stop-opacity="0.5"/>
        <stop offset="70%" stop-color="#03070f" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#03070f" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow" cx="50%" cy="42%" r="46%">
        <stop offset="0%" stop-color="${r.el}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${r.el}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#veil)"/>
    <rect width="${W}" height="${H}" fill="url(#focus)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    ${glyphSvg(quest.glyph, '#ffffff', W / 2 - 54, H / 2 - 118, 108, 1.5)}
    <rect x="${W / 2 - 46}" y="${H / 2 + 16}" width="92" height="5" rx="2.5" fill="${r.el}"/>
    <text x="${W / 2}" y="${H / 2 + 100}" text-anchor="middle" font-family="Onest" font-size="46"
      font-weight="800" letter-spacing="8" fill="#ffffff">${esc(r.caps)}</text>
  </svg>`;

  return sharp(art)
    .resize(W, H, { fit: 'cover', position: crop })
    .modulate({ brightness: 0.84, saturation: 0.86 })
    .composite([{ input: Buffer.from(overlay) }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

/* ── sanity check ─────────────────────────────────────────────────────────────
 * A missing font does not throw — librsvg just draws nothing. Verify there is
 * ink where the region name belongs, so a silent regression cannot ship 48 tiles
 * with no lockup on them. */
async function assertHasText(buffer, label, box) {
  const { data, info } = await sharp(buffer)
    .extract(box).greyscale().raw().toBuffer({ resolveWithObject: true });
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  if (max - min < 40) throw new Error(`${label}: no text rendered (flat ${min}–${max})`);
}

/* ── data ─────────────────────────────────────────────────────────────────── */
async function loadQuests(client) {
  const { rows } = await client.query(`
    SELECT s.id, s.slug, s.title, s.subtitle, s.price,
           parent.title AS parent_title, parent.image_url AS parent_image
    FROM services s
    JOIN categories c ON c.id = s.category_id
    LEFT JOIN LATERAL (
      SELECT p.title, p.image_url
      FROM service_addons a
      JOIN services p ON p.id = a.parent_service_id
      WHERE a.addon_service_id = s.id
        AND p.image_url IS NOT NULL AND p.image_url <> ''
        AND p.is_test_service = false
      ORDER BY (p.title ILIKE '%100%%') DESC, length(p.title), p.title
      LIMIT 1
    ) parent ON true
    WHERE c.slug = 'missions'
      AND s.is_test_service = false
      AND (s.image_url IS NULL OR s.image_url = '')
    ORDER BY s.title
  `);
  return rows;
}

async function artByTitle(client, pattern) {
  const { rows } = await client.query(
    `SELECT title, image_url FROM services
     WHERE image_url IS NOT NULL AND image_url <> '' AND is_test_service = false AND title ~* $1
     ORDER BY (title ILIKE '%100%%') DESC, length(title) LIMIT 1`,
    [pattern.source],
  );
  return rows[0] || null;
}

async function fetchArt(url) {
  fs.mkdirSync(ART_CACHE, { recursive: true });
  const file = path.join(ART_CACHE, path.basename(new URL(url).pathname));
  if (fs.existsSync(file)) return file;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`art ${url} → HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/* ── contact sheet ────────────────────────────────────────────────────────────
 * The tile is never seen at its own aspect ratio, so show it where it actually
 * lands: the wide hero on the service page and the little square in the cart. */
function writeContactSheet(built) {
  const row = (q) => `
    <figure>
      <div class="pair">
        <div><span class="lab">герой /service</span><img class="hero" src="${q.tileFile}" alt=""></div>
        <div><span class="lab">корзина</span><img class="thumb" src="${q.tileFile}" alt=""></div>
      </div>
      <figcaption><b>${esc(q.name)}</b><span>${REGIONS[q.region].label} · ${q.glyph} · ${q.slug}</span></figcaption>
    </figure>`;

  fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="ru"><meta charset="utf-8">
<title>Тайлы квестов — ${built.length} шт.</title>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:32px;background:#f8fafc;color:#0f172a;font:15px/1.5 Onest,system-ui,sans-serif}
  h1{font-size:26px;font-weight:800;margin:0 0 4px}
  p.sub{color:#64748b;margin:0 0 22px;max-width:80ch}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:24px}
  figure{margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px}
  .pair{display:grid;grid-template-columns:1fr 96px;gap:12px;align-items:start}
  .lab{display:block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;margin-bottom:5px}
  img{display:block;width:100%;object-fit:cover;border-radius:10px}
  .hero{aspect-ratio:16/10}
  .thumb{aspect-ratio:1;border-radius:12px}
  figcaption{margin-top:10px;display:flex;flex-direction:column;gap:2px;font-size:13px}
  figcaption span{color:#64748b;font-size:12px}
</style>
<h1>Тайлы квестов — ${built.length} шт.</h1>
<p class="sub">Это картинка для корзины, шторки корзины, заказов, админки, героя страницы услуги, телеграма и писем. В каталоге («/» и «/services») карточка рисует типографскую обложку сама — её видно только в приложении, тут её нет.</p>
<div class="grid">${built.map(row).join('')}</div>
</html>`);
}

/* ── main ─────────────────────────────────────────────────────────────────── */
const client = new pg.Client({ connectionString: process.env.DATABASE_URL.replace(/"/g, '') });
await client.connect();

let quests = await loadQuests(client);
if (ONLY.length) quests = quests.filter((q) => ONLY.includes(q.slug));
console.log(`Квестов без картинки: ${quests.length}`);

const problems = [];
const prepared = [];
for (const row of quests) {
  const manual = MANUAL[row.slug];
  const region = manual?.region ?? regionFromParent(row.parent_title);
  let artUrl = row.parent_image;
  if (manual?.artFrom) {
    const art = await artByTitle(client, manual.artFrom);
    if (art) artUrl = art.image_url;
  }
  if (!region) { problems.push(`${row.slug}: не удалось определить регион (родитель: ${row.parent_title ?? '—'})`); continue; }
  if (!REGIONS[region]) { problems.push(`${row.slug}: неизвестный регион «${region}»`); continue; }
  if (!artUrl) { problems.push(`${row.slug}: у региона ${region} нет арта`); continue; }
  prepared.push({
    id: row.id,
    slug: row.slug,
    name: row.subtitle || row.title,
    price: row.price,
    region,
    artUrl,
    glyph: glyphKeyFor(row.subtitle || row.title),
  });
}
if (problems.length) {
  console.error('\nНе обработаны:');
  for (const p of problems) console.error('  ✗ ' + p);
}

fs.mkdirSync(OUT, { recursive: true });
const built = [];
for (const quest of prepared) {
  const art = await fetchArt(quest.artUrl);
  const tile = await buildTile(quest, art);
  await assertHasText(tile, `${quest.slug} tile`, { left: 200, top: 400, width: 800, height: 160 });

  const tileFile = `${quest.slug}_tile.jpg`;
  fs.writeFileSync(path.join(OUT, tileFile), tile);
  built.push({ ...quest, tile, tileFile });
  process.stdout.write(`  ✓ ${quest.slug} (${REGIONS[quest.region].label}, ${quest.glyph})\n`);
}

writeContactSheet(built);
console.log(`\nГотово: ${built.length} файлов в ${path.relative(process.cwd(), OUT)}`);
console.log(`Посмотреть: ${path.join(OUT, 'index.html')}`);

/* ── publish ──────────────────────────────────────────────────────────────── */
if (PUBLISH) {
  const s3 = new S3Client({
    region: 'ru-central1',
    endpoint: 'https://storage.yandexcloud.net',
    credentials: {
      accessKeyId: process.env.YANDEX_KEY_ID,
      secretAccessKey: process.env.YANDEX_SECRET_KEY,
    },
  });
  console.log('\nЗаливаю в бакет…');
  for (const quest of built) {
    // Content-versioned name: changing a tile yields a NEW url, so the immutable
    // cache below can never go stale.
    const hash = crypto.createHash('sha1').update(quest.tile).digest('hex').slice(0, 16);
    const key = `services/quests/${quest.slug}_tile_${hash}.jpg`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: quest.tile,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    await client.query(
      `UPDATE services SET image_url = $1, quest_region = $2, updated_at = now() WHERE id = $3`,
      [CDN + key, quest.region, quest.id],
    );
    process.stdout.write(`  ↑ ${quest.slug}\n`);
  }
  console.log(`\nОпубликовано: ${built.length} услуг обновлено.`);
} else {
  console.log('\nНичего не залито и база не тронута. Публикация: --publish');
}

await client.end();
