# Refreshing the README screenshots

The README is a product page. Its artwork is generated, not hand-made, so when
a page changes you re-shoot that one page and rebuild. You never redo the layout.

```bash
node scripts/readme/snap.mjs            # all shots, from production
node scripts/readme/snap.mjs home cart  # or just the changed ones
./scripts/readme/build-shots.py         # rebuilds framed/* and hero.png
```

Needs a Chromium-family browser on PATH (brave, chromium or
google-chrome-stable), Node 22+, ImageMagick 7 (`magick`) and `rsvg-convert`.
The build downloads Onest (the site's own font) into `docs/shots/.fonts` on
first run; that directory is gitignored.

## How the staging works

The shots come from the LIVE site, but staged, which is the whole reason they
look good and stay honest:

- **Cookie consent is pre-declined** via `localStorage` before the page loads,
  so the banner never renders and Metrika/Webvisor never records the session.
- **The cart shot seeds `cart-storage`** (zustand persist) with real services:
  slug, title, price and S3 artwork are copied from the production catalogue.
  If one of them is renamed or repriced, refresh the rows in `snap.mjs` from
  the DB first. The README must never show a price the site doesn't charge.
- Everything else is simply the public page as an anonymous visitor sees it.

## The shot list

Each one has a job in the README. If a feature changes the page, re-shoot it;
if a feature adds a page worth selling, add it to `SHOTS` in `snap.mjs` first
and give it a URL label in `URLS` in `build-shots.py`.

| Name | Page | Must show |
|---|---|---|
| `home` | `/` | The hero with the live order showcase card and the trust badges |
| `services` | `/services` | The «Хит» rail, category chips with counts, search |
| `service` | `/service/natlan-100-19` | Wide region artwork, the quest warning, АР requirement, price |
| `cart` | `/cart` (seeded) | Two lines incl. a quest declaration chip, promocode field, totals |
| `reviews` | `/reviews` | The 5.0 header and real review cards |
| `service-mobile` | `/service/natlan-100-19` at 390px | The mobile header, breadcrumbs, floating cart button |

`hero.png` is composed from `services`, `home` and `service-mobile`, so
refreshing any of those three updates the banner on the next build.

## Gotchas already paid for

- The ImageMagick rounded-corner mask must be `xc:black -fill white`. A mask
  drawn on `xc:none` with no `-fill` uses the DEFAULT fill, which is black,
  and CopyOpacity then blanks the whole image.
- `settle` in `snap.mjs` (time after the load event) exists because the S3
  card images and the hero enter-animations land late. If a shot comes out
  with grey image boxes, raise it before suspecting anything else.
- Shots are 2x (desktop) and 3x (mobile) device-scale-factor captures. Don't
  shoot at 1x and upscale; the text will be soft in the hero.
