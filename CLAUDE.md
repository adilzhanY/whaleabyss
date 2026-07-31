# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start every session with a 2-minute review

The owner of this repo is learning to write code by hand. `.claude/learn/` is a
spaced-repetition database of what they know, when they last proved it, and how they got
it wrong. **Before doing anything else in a new session:**

```bash
node .claude/learn/bin/learn.mjs due
```

Pick the **one or two** most overdue concepts and open with either a short question or a
tiny piece of code for them to write — 2 minutes, not a lesson. Prefer a concept they
have actually failed before (`status: shaky`), and use its `note` field to target the
exact mistake they made rather than asking something generic. If nothing is due, run
`stale` and ask about the least recently touched concept instead.

Then grade the answer and get on with whatever they came here to do:

```bash
node .claude/learn/bin/learn.mjs grade <id> <again|hard|good|easy> --note "what happened"
```

Rules:
- **One warm-up per session, then stop.** Never re-quiz mid-session unprompted.
- If they say "skip review", drop it immediately and don't ask again that session.
- If the session then teaches them something new, `add` it before finishing — see
  `.claude/skills/learn/SKILL.md`.
- Grade honestly from evidence. A hint given means `hard`, not `good`.

Full teaching protocol: `/learn` or `.claude/skills/learn/SKILL.md`.

## Project Overview

Whale Abyss (genshin_abyss) is a Next.js e-commerce platform for Genshin Impact boosting services. The application handles service listings, user authentication, order management, payment processing via Freekassa, and Telegram bot notifications for admins.

**Brand & Mascot:**
- Mascot: **Valle**, a whale girl. She's the face of the brand across marketing material.
- Two chibi-head poses are used: `public/images/valle_chibi_sad.png` (frustrated — paired with the "can't clear the abyss?" pain-point CIA) and `public/images/valle_chibi_happy.png` (happy — paired with the URL/CTA scene).
- Primary marketing asset: `public/banner.html` — a self-contained animated banner. Parallelogram card silhouette via inline SVG `<clipPath>`, GSAP-driven scene timeline (sad CIA → happy CTA), and a decorative SVG layer (bubbles, tildes, dot grids, three-dot ellipses).
- Valle's head animates with a stepped/hold-keyframe "tick" (no interpolation between rotation poses) — mimics stop-motion. Decorations use the same effect at half speed.
- Brand blue: `#0B5191` (use this for all blue text/accents). Brand font: Onest.

**Tech Stack:**
- Next.js 16 (App Router)
- TypeScript
- PostgreSQL with Drizzle ORM
- NextAuth.js for authentication
- Zustand for client state management
- Telegraf for Telegram bot
- Freekassa payment gateway
- Yandex Cloud S3 for image storage

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run Telegram bot in polling mode (development)
npm run bot:dev
```

## Deployment

- **Production auto-deploys from `main`.** A GitHub pipeline builds and ships to
  the prod server (https://whaleabyss.ru) automatically on every push to `main` —
  there is no manual `git pull`/`npm run build`/restart step on prod.
- **CI gate (`.github/workflows/deploy.yml`):** two jobs — `verify` then `deploy`
  (`deploy` `needs: verify`). `verify` runs on GitHub's runners: `npx tsc --noEmit`
  is the **hard gate** (blocks deploy on failure; needs no DB/secrets), and
  `npm run lint` runs **non-blocking** (`continue-on-error`) because there are ~85
  pre-existing lint errors. If `verify` fails, `deploy` is skipped and prod is untouched.
  - The full `next build` is **NOT** run in CI — it does build-time DB queries a runner
    can't reach. It runs on the VM in the `deploy` job instead.
  - **The VM build is out-of-place and the swap is atomic.** `next build` rewrites its
    output dir as it goes and `next start` reads from it at runtime, so building straight
    into `.next` breaks the app that is currently serving — for the whole build, on every
    deploy. On **2026-07-25** a VM build failed and prod returned 500 on every prerendered
    route (`client reference manifest ... does not exist`) until it was rebuilt by hand;
    `set -e` correctly skipped `pm2 restart`, but the build had already destroyed the live
    `.next`. The deploy now:
    1. builds into `.next-build` (`NEXT_DIST_DIR`, read by `next.config.ts` → `distDir`),
       **retrying once** because the remote DB is occasionally flaky from the VM;
    2. refuses to continue unless `.next-build/BUILD_ID` exists;
    3. `mv .next .next-prev && mv .next-build .next && pm2 restart`;
    4. health-checks `/` **and** `/services` (a prerendered route — a broken `.next` still
       answers dynamic routes, which is how the last breakage looked healthy at a glance),
       and **rolls back to `.next-prev`** if it doesn't come up.
    A failed build is now a no-op, not an outage. Verified on the VM: a happy-path deploy
    held 100% availability across build+swap+restart, and both a failing build and a
    BUILD_ID-less build exit non-zero with `.next` untouched and the app still serving.
  - **Don't set `NEXT_DIST_DIR` in pm2's environment.** It's only for the build step; the
    running app must read the default `.next`.
  - `tsc --noEmit` passes on a cold checkout even though `next-env.d.ts` imports the
    not-yet-generated `.next/types/routes.d.ts` (TypeScript tolerates it).
- **Implication: pushing to `main` ships to live customers** once `verify` passes.
  Treat a push as a production release. Don't push half-finished or unverified work to
  `main`; confirm `npm run build` passes locally first.
- **Dependencies:** do **NOT** run `npm audit fix --force` — it tries to *downgrade*
  Next.js to 9.x and next-auth to 1.x (breaking). Bump versions explicitly instead.
  Remaining `npm audit` moderates (next/postcss bundled, uuid via next-auth) have no
  clean forward fix yet.
- **Env vars are NOT in git** (`.env` is gitignored). New env vars (e.g.
  `TELEGRAM_WEBHOOK_SECRET`) must be added to the prod environment separately —
  pushing code that reads a new var does not provision it on prod.
- **Telegram webhook is registered out-of-band**, not by the deploy. After
  changing `TELEGRAM_WEBHOOK_SECRET` (or the domain), re-run
  `node scripts/telegram/set_telegram_webhook.mjs` on prod.
- **Pushing `deploy.yml` (or any `.github/workflows/*`) needs a token with the
  `workflow` scope.** A plain Personal Access Token is rejected by GitHub
  (`refusing to allow a Personal Access Token to ... workflow without workflow scope`).
  Add the scope at github.com/settings/tokens, or push those files with SSH-based
  git auth.

## Production VM & Infrastructure (Yandex Cloud)

**Host:** Yandex Compute Cloud, folder `default` (`cloud-uid-inaiu7wc`), zone
`ru-central1-a`.

**Production VM `waubu`:**
- **Static public IP `93.77.188.163`** (Kind: Static, zone `ru-central1-a`) — this
  is what the domain A-record and `deploy.yml` `host:` point at. A Yandex static IP
  is **zonal**: it only attaches to a VM in its own zone, and it stays reserved when
  the VM is deleted (so you can move it to a replacement VM).
- **Shared-core `2 vCPU @ 20% guaranteed, 4 GB RAM`**, 20 GB SSD boot disk, Ubuntu
  24.04. Shared-core (burstable) is deliberate — the site idles and only needs CPU
  bursts for page loads/builds; it's ~1/3 the price of dedicated cores (~10–11k ₸/mo,
  ≈ $20). vCPU/RAM/core-fraction are all changeable later by **stopping** the VM and
  editing (nothing here is permanent).
- App lives at **`/var/www/whaleabyss`**, run by **pm2 (fork mode)** as process
  `whaleabyss` (`next start`, port 3000); **nginx** reverse-proxies to `127.0.0.1:3000`.
  `pm2 save` persists the process list to `~/.pm2/dump.pm2`; the **`pm2-qantr` systemd
  service is enabled** so the app auto-starts on reboot.

**SSH access (user `qantr`, UID 1000):**
- `ssh qantr@93.77.188.163`. Local fish aliases (`~/.config/fish/config.fish`):
  `ssh_connect_wa_vm` = login; `ssh_connect_wa` = the DB tunnel
  `ssh -N -L 5432:127.0.0.1:5432 qantr@93.77.188.163` (the remote Postgres is only
  reachable through this tunnel).
- Two authorized keys on the VM (`/home/qantr/.ssh/authorized_keys`): `wopler@pc`
  (`~/.ssh/id_ed25519`, the everyday dev key) and `qantr@adarch` (`~/.ssh/id_adarch`,
  the laptop that created the VM). **The GitHub Actions deploy uses `qantr@adarch`**
  (stored as the `SSH_PRIVATE_KEY` repo secret), so that key must stay in
  `authorized_keys` or auto-deploy breaks with "Permission denied".
- The keys also live in the **VM metadata** (Access → SSH keys). On a fresh boot
  cloud-init *appends* metadata keys to `authorized_keys` (it does not truncate), so
  keys baked into the image survive.

**Swap is mandatory:** a 4 GB `/swapfile` (in `/etc/fstab`, `vm.swappiness=10`). With
4 GB RAM and **no** swap, `npm run build` (the on-VM deploy step) gets OOM-killed. If
you ever rebuild the VM, recreate the swapfile before the first deploy.

**Full-disk lockout incident (2026-07-18) — root cause & recovery runbook:**
- **Symptom:** site down (502), SSH refused/`Permission denied`, serial console showed
  `cloud-init OSError [Errno 28] No space left on device`.
- **Root-cause chain:** the boot disk had been resized 10→20 GB, but the **partition
  was never grown** (`vdb1` stayed ~9.4 GB while the disk was 20 GB) → filesystem hit
  100% → the deploy `npm run build` OOM'd/filled the last bytes → **cloud-init
  truncated `authorized_keys` to 0 bytes** on the full disk → SSH auth impossible.
- **Why the "easy" fixes don't work here:** Yandex has **no GRUB-catch** (serial GRUB
  needs `console=ttyS0` pre-baked in the image + `serial-port-enable=1` — the stock
  image has neither, and you can't add them without disk access). Single-user mode
  wouldn't help anyway — you can't write to a 100%-full disk. And **Yandex boot disks
  cannot be detached** from their VM.
- **The professional recovery (offline disk repair via a rescue VM) — the runbook:**
  1. **Snapshot** the broken boot disk (only way to get a detachable copy).
  2. Create a **rescue VM** (plain Ubuntu) with a **new disk created *from that
     snapshot* attached as a secondary** drive (leave "delete with VM" unchecked).
  3. SSH into rescue; the broken disk is `/dev/vdb` (unmounted). Repair from outside:
     `sudo growpart /dev/vdb 1` → `sudo e2fsck -fy /dev/vdb1` → `sudo resize2fs
     /dev/vdb1` (fills the disk). Then `mount /dev/vdb1 /mnt/wa`, free space if needed,
     and **rewrite `/mnt/wa/home/qantr/.ssh/authorized_keys`** with both public keys
     (`chown 1000:1000`, `chmod 600`). `umount`.
  4. Detach the fixed disk; **Create image** from it (image is region-wide, so it can
     boot a VM in *any* zone — this is how you get back to `ru-central1-a`).
  5. **Create the new prod VM** from that image in `ru-central1-a`, Login `qantr` +
     both keys, and assign the freed static IP `93.77.188.163` (delete the old VM first
     to release the IP — it stays reserved because it's Static).
  6. On the new VM: recreate **swap**, `cd /var/www/whaleabyss && npm install && npm run
     build`, `pm2 restart whaleabyss && pm2 save`, verify `curl localhost:3000` and
     `https://whaleabyss.ru` → 200. Then delete the rescue VM (keep the snapshot/image
     as backups for a while).
- **Note:** `e2fsck` exits non-zero (code 1) when it *corrects* errors — that's success,
  not failure; don't let `set -e` abort the script before `resize2fs` runs.

## Database Management

**See `DB_RULES.md` for comprehensive database guidelines.**

Key points:
- Schema: `./lib/schema.ts`
- Connection: `./lib/db.ts`
- ORM: Drizzle with node-postgres Pool
- Migrations: Create `.mjs` scripts in root, run with `node script.mjs`, then delete
- Record applied schema changes (the SQL) in `migrations.sql` for history
- After schema changes: Always run `npm run build` to refresh TypeScript types
- Use `IF NOT EXISTS` in migrations for idempotency
- Strip quotes from `DATABASE_URL`: `.replace(/"/g, '')`
- The remote DB connection can be flaky from the dev machine (transient `ECONNRESET`);
  retry a failed migration or `npm run build` (build-time queries prerender pages like `/`)

**Common query pattern:**
```typescript
import { db } from '@/lib/db';
import { services } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const result = await db.select().from(services).where(eq(services.id, id));
```

## Architecture

### App Structure (Next.js App Router)

- `/app` - Pages and layouts using App Router conventions
  - `/api` - API routes (auth, admin, cart, checkout, payment webhooks, reviews, etc.)
  - `/admin` - Admin dashboard (protected by middleware)
  - `/service/[slug]` - Dynamic service detail pages
  - `not-found.tsx` - Branded 404 page (sad Valle chibi, big brand-blue "404",
    "back home" button, shared Header/Footer); App Router renders it for any
    unmatched route.
  - Client components use `"use client"` directive
- `/lib` - Shared utilities and core logic
  - `schema.ts` - Drizzle ORM schema definitions
  - `db.ts` - Database connection
  - `freekassa.ts` - Payment gateway integration
  - `telegramClient.ts` - Telegram bot setup and handlers
  - `email.ts` - Nodemailer email sending
  - `rateLimit.ts` - In-memory auth rate limiter (see Auth Rate Limiting below)
  - `auth/` - NextAuth configuration
- `/components` - Reusable React components
- `/store` - Zustand stores (e.g., `useCart.ts`)
- `/scripts` - Utility scripts (e.g., `run-bot-polling.ts`)
- `/types` - TypeScript type definitions

### Key Architectural Patterns

**Authentication & Authorization:**
- NextAuth.js with credentials provider + Yandex ID OAuth («Войти с Яндексом»)
- **Yandex OAuth:** no NextAuth adapter — the `signIn` callback maps the Yandex
  identity onto our own tables via `lib/oauthUser.ts` → `getOrCreateUserFromYandex()`:
  match `oauth_accounts` (provider, providerAccountId) → else link by verified email →
  else create a user with `passwordHash = NULL` (auto-generated ASCII username,
  avatar hotlinked from `avatars.yandex.net` — whitelisted in CSP `img-src` and
  `images.remotePatterns`). The callback rewrites `user` to the local row, so the
  jwt/session callbacks are provider-agnostic. Sign-in is denied if Yandex returns
  no email. OAuth-only users can set a password later via the forgot-password flow;
  credentials login rejects NULL-hash accounts with the generic error (no enumeration).
  App: oauth.yandex.ru, scopes `login:email login:info login:avatar`, redirect URIs
  registered for prod + localhost (`/api/auth/callback/yandex`)
- User roles: `user`, `admin`, `booster` (enum in DB)
- **The JWT is a cache of the `users` row, never a second source of truth.** The `jwt`
  callback re-reads `role`, `username` and `avatarUrl` from the DB on every request
  (one query, the one that already existed for `role`) and only then applies an explicit
  `trigger === 'update'` override. Anything a client renders from `useSession()` — the
  header avatar and name — therefore self-heals on the next session read.
  - **Why:** the avatar used to live *only* in the token, written by the client's
    `useSession().update({ image })` after the upload. `/profile` reads the DB and showed
    the new picture, while the header kept the old one **permanently** (the token lives 30
    days) whenever that one call didn't land: a failed/raced POST, or simply the change
    being made in another browser or device. Verified with a hand-minted token whose
    `image`/`name` disagreed with the row — before the fix `/api/auth/session` served the
    stale values forever, after it serves the row.
  - The `update()` calls in `ProfileClient`/`PersonalDataCard` are kept as an *optimistic*
    nudge for instant feedback, wrapped in try/catch: they must never fail a save or block
    the following `router.refresh()`. (`update()` also silently returns `undefined` while
    `SessionProvider` is loading — one more reason not to depend on it for correctness.)
- Middleware (`middleware.ts`) protects `/admin/*` and `/api/admin/*` routes
- Admin routes have two-layer protection: Edge middleware + server-side checks
- **Never decide "logged in or not" from `useSession()` alone when it changes what
  renders.** `SessionProvider` is not seeded, so `useSession()` starts as
  `status:'loading'` with `data: undefined`; a `session?.user ? A : B` branch therefore
  renders the **guest** variant first and corrects itself a tick later. On `/` that showed
  the Valle welcome hero to signed-in customers for one frame on every visit, including
  client-side navigations (e.g. `/orders` → `/`).
  - **The fix, and the pattern for any new personalized page:** resolve the session on
    the **server** — the auth cookie is already on the request — and pass it in as a prop.
    `app/page.tsx` does `getServerSession(authOptions)` and hands `initialSession` to
    `HomeClient`, which uses `status === 'loading' ? initialSession : clientSession`. The
    server render, the hydration render, and the RSC payload used by client-side
    navigation are then all correct on the first frame, while the hook still owns the
    state afterwards so in-tab sign-in/sign-out updates instantly.
  - **Cost check before copying this:** reading the session makes a route dynamic. `/` was
    already dynamic (`revalidate = 0`), so this was free. Doing the same in
    `app/layout.tsx` would fix the whole app at once (the Header still flashes
    «Войти» → avatar) but would turn every currently-static page dynamic — only the
    marketing/legal pages (`/about`, `/faq`, `/info`, `/contacts`, `/payment`,
    `/public_offer`, `/reviews`) are prerendered, so it is a real but bounded trade-off.
  - Effects that load per-user data must key on `session.user.id`, **not** the session
    object — its identity changes when the client provider takes over from the server
    value and on every next-auth refetch, firing duplicate requests (same class of bug as
    the `CartSync` one under Cart Management).

**Cart Management:**
- Zustand store with localStorage persistence (`store/useCart.ts`)
- Cart syncs to database `cart_items` table for authenticated users
- Cart persists across sessions via `persist` middleware
- **`loadFromDb` merges on the login transition, replaces otherwise.** `components/CartSync.tsx`
  calls it with `merge: true` exactly once per signed-in account; `mergeCarts` unions the local
  cart into the DB copy (DB wins on quantity/dates, a browser-only line is kept, a quest
  declaration on either side survives) and pushes the union back up if the browser contributed.
  A plain `loadFromDb()` still replaces, so deletions stay authoritative.
  - **Why:** signing in used to overwrite the local cart with the DB copy, and nothing uploaded a
    guest cart first — so building a cart while signed out and then logging in to pay destroyed
    it. «Войти с Яндексом» made it deterministic (full-page redirect away and back → customer
    returns to an empty `/cart`). Don't revert to an unconditional replace.
  - **Effect deps matter:** `CartSync` keys on `session.user.id`, **not** the `session` object.
    next-auth returns a new session object on every refetch (including on window focus), so
    keying on the object re-ran the load on every tab/app switch and each run overwrote the cart
    — silently reverting it whenever a `syncToDb` had quietly failed.
  - A module-scope revision counter in `store/useCart.ts` is bumped by every mutator;
    `loadFromDb` captures it before its request and discards the response if the cart changed
    meanwhile, so a slow read issued before an add can't land after it and revert the line.
  - Known trade-off: an item deleted on another device can reappear after login. Accepted — a
    stale line is visible and one tap to remove; silently losing the cart is a lost sale. Strict
    cross-device last-write-wins would need per-line timestamps in `cart_items`.
- **Syncs are SERIALISED — never fire two `POST /api/cart/sync` at once.** The route is
  delete-everything-then-insert-the-payload, and its latency scales with cart size, so
  concurrent syncs complete in the WRONG order: deleting lines one after another produced
  progressively smaller (faster) requests, and the older, bigger snapshot landed last and
  re-inserted the deleted rows. Measured on a real cart: a 5-item sync took 1.08 s, the
  «cart is empty» sync fired 60 ms later took 0.65 s — the DB kept all five rows and the
  next page load read them back («удалил всё, перешёл на страницу, товары вернулись»).
  - `store/useCart.ts` now keeps at most one request in flight (`syncInFlight`) and each
    request reads `get().items` at SEND time, so a burst collapses into one trailing write
    that carries the final state. Don't reintroduce a bare `fetch` per mutation.
  - The route resolves all slugs in ONE `inArray` query (it was a SELECT per item in a loop)
    and does delete+insert in a transaction.
- **`CartSync` merges only on the FIRST mount for an account in this browser** (marker
  `localStorage['cart-merged-for']`), then plain-reads. Merging on every mount let any client
  whose copy was behind — a second tab, a hard reload, a Fast Refresh — union deleted lines
  back in and push them up. The exception is `cartSyncFailed()`: if the last sync never
  reached the server the browser holds the only copy of the change, so it merges instead.

**Payment Flow:**
- Public checkout (`/api/checkout`) recomputes every line price and the order
  total **server-side** from current `services.price` — the client-supplied
  `total`/`item.price` are ignored entirely (prevents price tampering). Test
  services and unknown slugs are rejected; promocodes are validated via
  `validatePromocodeForUser` (same helper as the admin manual-order route).
- Freekassa SCI form redirect (default checkout method)
- Webhook at `/api/payment/freekassa/notify` verifies signature and updates order status
- Signature verification: `md5("{shop_id}:{amount}:{SECRET_2}:{merchant_order_id}")`
- Must respond with plain text "YES" to webhook
- Late-payment re-open: a webhook for an order with `status='cancelled' AND paymentId IS NULL`
  is treated as a first-time payment — the order is flipped to `paid` and full fulfillment
  runs (admin notified, email sent, cart cleared). This covers the case where the cleanup
  job auto-cancels an order while the user is still slowly completing payment on FK's page.
  Orders with `paymentId` already set are never re-processed.

**Admin Dashboard (`/admin`) — «отчёт о прибыли»:**
- The headline is **прибыль**, and the card spells out how it was reached:
  **выручка − комиссии качеров = прибыль**, over the selected window. The stacked bar
  chart under it is the same split per bucket (blue = kept, amber = paid out), which is
  why there is no separate «Заработок бустеров» card any more — it plotted the same series.
- **«Расходы» are ONLY booster commissions.** Hosting, ads, taxes and acquiring fees are
  not in the DB at all, so the margin reads ~83%. The label says «Комиссии качеров» on
  purpose — do not rename it to «Расходы» without first adding a real expenses table.
- **Time window: `?period=month|quarter|year` + `?anchor=YYYY-MM`** (`app/admin/_components/period.ts`).
  Buckets differ per scope — weeks inside a month, months inside a quarter/year — because at
  ~30 orders a month a per-day axis is mostly empty (13 of 31 days in July 2026 had none).
  `?month=` from old bookmarks is still honoured as the anchor. The месяц/квартал/год
  switcher is the **HeroUI `Tabs`** pill — the same component as «Войти / Регистрация» in
  `AuthModal` — styled with slate utilities (only those are remapped by `admin-dark`);
  its indicator carries `.period-tab-indicator` because `bg-white` remaps DARKER than the
  track on black, which made the selected tab read as a hole.
  - The quarter/year bucket expression **inlines the month offset with `sql.raw`**. Bound as
    a parameter, `extract(month from …)::int - $1` fails outright — Postgres can't infer the
    type of a bare parameter there.
- Deltas always name their baseline (`win.prevLabel` → «к июню 2026»). A raw «+218%» is
  misleading here: revenue before **2026-06-19** is written off as «учебная» (see
  `lessonOrders.ts`), so any window spanning that date compares against a partly zeroed base.
- **Средний чек** divides by orders whose money was actually counted (non-refunded,
  post-cutoff), not by all orders in the window.

**Order Lifecycle Cleanup:**
- `pending` orders older than 1 hour are auto-flipped to `cancelled` (abandoned checkouts).
- `cancelled` orders with `paymentId IS NULL` and `updatedAt` older than 1 day are hard-deleted.
- The 1-day buffer covers Freekassa's 24h webhook retry window — a late payment can still
  re-open and fulfill the order during that buffer (see Payment Flow).
- Orders that were paid and later cancelled by an admin (`paymentId` set) are never auto-deleted.
- Logic in `lib/orderCleanup.ts`. Exposed two ways:
  - `node cleanup_stale_orders.mjs` — raw-SQL script for system cron or manual runs.
  - `GET/POST /api/cron/cleanup-orders` — protected by `Authorization: Bearer ${CRON_SECRET}`,
    for serverless / external schedulers.
- User-facing order lists (`/api/user/orders`, `…/past`) hide cancelled-with-no-paymentId
  rows so abandoned checkouts don't clutter "Мои заказы".
- Admin order detail shows "Автоматически отменён" subtitle when status=cancelled + no paymentId.

**Order Notifications:**
- Telegram bot sends notifications to admin chat on new paid orders
- Inline keyboard buttons allow admins to update order status directly from Telegram
- Bot handles callback queries to update order status in DB
- **Webhook authenticity:** `/api/telegram/webhook` verifies the
  `X-Telegram-Bot-Api-Secret-Token` header against `TELEGRAM_WEBHOOK_SECRET`
  (constant-time) before calling `bot.handleUpdate`. This is the real auth —
  the `adminChatId` check in `lib/telegramClient.ts` is defense-in-depth only,
  since `message.chat.id` comes from the (spoofable) request body. Degrades
  gracefully (warns + proceeds) if the secret isn't configured, for local dev.

**Quest Addon Upsell (exploration services) — flow & incident post-mortem:**
- Exploration ("map cleaning") services have linked quest services in `service_addons`
  (admin-managed). Adding such a service to the cart goes through
  `useAddToCartWithAddons()` (`components/QuestAddonModal.tsx`): it fetches
  `/api/services/[slug]/addons` and, if non-empty, opens `QuestAddonModal` instead of a
  plain add. The client's choice travels cart → `cart_items.addon_choice` (sync/load)
  → checkout → `order_items.addon_choice`, and is rendered in the admin panel and the
  Telegram order notification so the booster knows whether the gating quests are on the client.
- **Three declaration values, all positive** (`lib/addonChoice.ts` — the single source of
  truth for the type, the whitelist guard `isAddonChoice`, and every UI label):
  `'completed'` («уже выполнены»), `'self'` («пройду сам»), `'quests'` (ticked quests, which
  are added as separate cart lines). `'quests'` used to be left NULL — see the post-mortem
  below for why that was the bug. Adding a fourth value means updating `lib/addonChoice.ts`
  only; the column is `varchar(20)`, so no migration is needed.
- **`POST /api/checkout` is the backstop and the load-bearing guarantee.** Before creating the
  order it re-reads `service_addons` and rejects with **409** `{code:'ADDON_CHOICE_REQUIRED',
  slugs}` any line whose service has (non-test) quest links but carries neither a
  `'completed'`/`'self'` declaration nor at least one of its quest services in the same order.
  `'quests'` with no quest lines in the order is rejected too — that's the "ticked them, then
  deleted them in the cart" case. `app/cart/page.tsx` catches the 409 and re-opens
  `QuestAddonModal` in **`mode:'declare'`** (`store/useAddonPrompt.ts`), which applies the
  declaration to the line already in the cart via `useCart().declareAddon()` without touching
  its quantity; the cart is never cleared and the user just presses pay again. Verified by
  replaying all 50 post-feature paid orders: blocks exactly the 2 known-bad ones, passes 48.
  - The addon-link lookup filters `services.isTestService = false`, mirroring
    `/api/services/[slug]/addons` — otherwise hiding a quest service would block its parent
    while the modal had nothing left to offer, leaving an unpurchasable cart.
  - The gate is deliberately **not** applied to `/api/admin/orders` (manual orders) or
    `/api/admin/testing/checkout` — an admin creating an order has already spoken to the client.
  - **409 is reserved for this.** 422 is already the Adventure Rank gate, which the cart page
    reads as plain text; don't reuse it.
- **The client modal is an ADD-TIME gate only** and must never be treated as sufficient — a line
  restored from `cart_items` by `loadFromDb` bypasses it entirely. The server gate is what holds.
- **`ServiceItem.hasQuestAddons` (server-rendered, `lib/services.ts`) decides whether a
  declaration is required — never a fetch.** The old flow asked `/api/services/[slug]/addons`,
  so one failed request silently skipped the mandatory modal. Now a non-gated service fetches
  *nothing* on add (faster, zero failure surface) and the fetch is only for the quest LIST.
  - Pass it through from every add-to-cart call site (`components/ServiceCard.tsx`,
    `app/service/[slug]/ClientServicePage.tsx`) as the 4th arg to `useAddToCartWithAddons().add`.
  - A stale `false` is possible on prerendered listing pages if an admin links a quest after a
    deploy (`/service/[slug]` is dynamic, so the detail page is always fresh). The `/api/checkout`
    409 catches it — that is the whole point of having the server gate.
- **`lib/questAddons.ts` → `fetchQuestAddons()` returns `null` for "couldn't find out" and an
  array for a definitive answer.** Keep that distinction. It's why
  `/api/services/[slug]/addons` returns **404** for an unresolvable service and **503**
  `{error}` (never an `addons` key) on failure — a success-shaped error body is what let a blip
  masquerade as "no quests". 3 attempts, 4s timeout each, ~13s bounded worst case.
  - When the list can't be loaded, the add is **refused** (`AddonUnavailableModal`, retry in one
    tap), never degraded into an undeclared line. Don't "fix" this by adding it anyway.
  - `useAddToCartWithAddons()` returns `{ add, pending }`; `pending` drives the button spinner
    and a ref-based in-flight guard makes a second tap a no-op. Two racing chains used to be
    able to add a bare line *behind* the open modal.
  - The addons route is rate-limited **by user id** when signed in, falling back to IP.
- **Incident (order `f216229e`, 2026-07-12):** a paid order for a quest-gated service
  arrived with `addon_choice = NULL` and no quest lines — the admin notification showed
  nothing and there was no way to tell what the client wanted. Diagnosis: code and data
  were fully intact (addon links present, prod API returning them); the root cause was the
  add-to-cart flow's *silent fallback* — any single failed `/addons` fetch (mobile network
  blip, transient 500/429) skipped the modal and did a plain add, losing the declaration
  with no trace. Lesson: **a graceful degradation on a revenue-relevant path must never be
  silent** — degrade for the user, but surface the degradation to the operator.
- First fix attempt (commit `cdebec0`): (1) the addons fetch retries ×3 with backoff before
  falling back; (2) the Freekassa-notify Telegram message detects the bad shape server-side and
  appends «❗ Услуга с заданиями, но клиент не сделал выбор — уточните у клиента».
- **It did not hold — the bug recurred on 2026-07-25** (order `96162b2e`, `fonteyn-4-1-11`,
  2000 ₽, a Yandex-OAuth buyer). Full DB audit at the time: ~27 gated order lines since the
  feature shipped, exactly **2** broken (2026-07-12 and 2026-07-25); **0** post-feature
  `cart_items` rows in the bad shape (so the add-gate does write the declaration when it runs);
  neither buyer had a legacy cart row; no deploy near either incident. Root causes:
  1. **The real one — `addWithQuests` wrote `addonChoice: undefined` on the parent**, so "I'm
     buying the quests" existed only as sibling cart lines. Deleting those lines — one tap on
     the trash, or on «−» at qty 1, since `updateQuantity(id, 0)` removes the line — silently
     reverted the parent to an indistinguishable NULL. `cdebec0` never touched this path, which
     is exactly why the retry fix changed nothing. Fixed by the `'quests'` value above.
  2. **No backstop after the add.** Checkout trusted the client array and never consulted
     `service_addons` or its own `cart_items.addon_choice` copy, so any single loss became a
     paid order. Fixed by the 409 gate above.
  3. Contributing (all since fixed — see the client-gate bullets above): `cdebec0`'s retry budget
     was ~1.2 s while the addons endpoint's own rate-limit window is 60 s and was IP-keyed; the
     route returned 200 `{addons:[]}` for parent-not-found, which `break`s the retry loop with
     zero verification; and neither add button had an in-flight guard or a fetch timeout, so a
     slow chain invited a second tap whose fallback added a bare line *behind* the modal.
- **Lesson (unchanged, and now enforced): a graceful degradation on a revenue path must never be
  silent — and a client-side gate is a UX affordance, not a guarantee. Put the invariant on the
  server.** Metrika Webvisor session replay remains the tiebreaker for "what did the client
  actually click".
- Still open (known TODO, tracked in the plan): 74 legacy `cart_items` rows across 36 users,
  created before 2026-06-08, sit on gated services with no declaration. They are harmless now —
  the 409 gate catches them at checkout and re-prompts — but a cart-render-time warning would be
  friendlier than discovering it at the payment step.

**Boosters (качеры) & Commission Payouts:**
- `boosters` table is an admin-managed roster at `/admin/boosters` (list with
  filter+search), `/admin/boosters/new`, and `/admin/booster/[boosterId]` (detail + edit
  modal). Boosters don't register as boosters — they register as **normal users** and the
  admin links the account (see Booster Portal below).
- Orders link to a booster via `orders.boosterId` (nullable FK). Assigned from the **"Бустер"**
  column on `/admin/orders` and the dashboard recent-orders table, via the shared
  `app/admin/_components/OrderBoosterCell.tsx`:
  - unassigned + status `paid`/`in_progress` → "Назначить" button (opens `AssignBoosterModal`);
    first assignment also flips the order to `in_progress`.
  - already assigned → name links to the booster + "Сменить" pencil (re-assign **without**
    changing status).
  - status `cancelled`/`pending` → shows "—" (no assignment offered).
- **40/60 split:** on completion, `lib/boosterPayout.ts` → `creditBoosterForCompletedOrder()`
  credits `commissionPercent / 100` (default 40%) of the **pre-discount** order value —
  `Σ order_items.priceAtPurchase × quantity`, **not** `orders.totalPrice` — to `booster.balance`,
  so a customer's promocode discount never shrinks the booster's cut (falls back to
  `totalPrice` for legacy orders with no line items). The amount is written to
  `orders.boosterEarning` which doubles as an **idempotency guard** (credit happens exactly
  once, never recomputed). Called from both the admin order PATCH and the Telegram completion
  callback. **Does not touch revenue** — the dashboard sums `orders.totalPrice`.
- Assignment status logic lives in `PATCH /api/admin/orders/[id]` (accepts `status` and/or
  `boosterId`); re-assignment leaves status untouched.

**Booster Portal (/portal):**
- Boosters access their own page at `/portal` using their **regular site account**
  (email+password, captcha+OTP registration — all the existing customer auth). The admin
  links the account on `/admin/booster/[id]` («Доступ в портал», by email): one
  transaction sets `users.role='booster'` + `boosters.userId` (unique FK,
  `ON DELETE SET NULL`). Unlink (or booster deletion) reverses both.
- **Identity model:** the `booster` role only *gates* `/portal/*` + `/api/portal/*`
  (edge middleware, same pattern as admin). The actual identity is the
  `boosters.userId` FK resolved by `lib/portalAuth.ts` → `getBoosterContext()` — every
  portal query is scoped through it; inactive boosters are rejected there.
- Portal shows: read-only legal data (ФИО, birthDate, ИНН, реквизиты, commission),
  revenue (**only the booster's cut** — `balance` to be paid out + total earned; order
  `totalPrice` is never exposed), own documents (view/download via
  `/api/portal/documents/[docId]`, same private-bucket streaming as admin), and assigned
  orders.
- **Order actions:** the only status transition a booster may make is
  `in_progress → completed` (`PATCH /api/portal/orders/[id]` `{action:'complete'}`) —
  credits commission via `creditBoosterForCompletedOrder` and notifies the admin chat
  (`notifyAdminAboutBoosterStatusChange`, full order+booster context). The per-order
  «я на аккаунте» toggle (`orders.boosterOnline`, in_progress only) shows the customer a
  «Бустер на аккаунте» badge in `OrderCard`; toggles deliberately do NOT notify.
- Future direction: Telegram-bot-driven flow (client sends OTP/account data to the bot,
  bot relays to the booster's portal page, template replies) — keep portal APIs
  extensible for that.

**Manual Orders (off-site payments):**
- `/admin/orders/new` ("Добавить вручную" button) lets an admin create a **paid** order for a
  customer who paid directly. `POST /api/admin/orders` computes the total **server-side** from
  current prices (never trusts the client), sets `paymentId='MANUAL'` (so cleanup never treats
  it as abandoned), records promocode usage, and sends the Telegram admin notification. No
  customer email is sent.
- Promocodes are validated against the **chosen customer** via `lib/promocodeValidation.ts`
  (`validatePromocodeForUser`), used by both the create route and the live-preview endpoint
  `/api/admin/orders/validate-promocode`.

**Registration Captcha (Yandex SmartCaptcha):**
- Registration in `components/AuthModal.tsx` has a `captcha` step between the form and the OTP
  step. The OTP is only sent after a successful solve; the token is verified **server-side** in
  `/api/auth/send-otp` via `lib/smartcaptcha.ts` before any DB work or email.
- Tokens are single-use, so "Отправить снова" routes back through the captcha. Degrades
  gracefully (skips captcha) if the keys aren't configured.
- Chosen for reliability in Russia (Cloudflare is throttled there). Free up to 250k checks/mo.

**Cookie Consent & Analytics (Yandex.Metrika):**
- Yandex.Metrika (counter `109309287`, **Webvisor enabled**) is a real `<script>` in the
  `app/layout.tsx` `<head>` (so the tag is verifiable by Yandex and auto-sends its hit — use
  the **standard** init params, do NOT add `ssr:true`/manual `referrer`/`url`).
- **Opt-out model:** the head script loads Metrika for everyone **except** visitors who declined
  (`localStorage['wa-cookie-consent'] === 'declined:1'`). `components/CookieConsent.tsx` renders
  the consent banner (brand style; bottom-left on desktop, centered modal on mobile/tablet),
  persists the choice (per-browser, versioned, shown once), and clears `_ym_*` cookies on
  decline. The literal `declined:1` is duplicated in the layout guard — keep in sync if the
  consent version changes.
- Privacy policy (`/privacy`, dates in `lib/legal.ts`) discloses Metrika + Webvisor (§9) and
  names Yandex as a recipient (§7).

**Image Uploads:**
- Yandex Cloud S3 via `@aws-sdk/client-s3`
- Images stored in `whaleabyss-bucket`
- Remote pattern configured in `next.config.ts`
- **Caching:** all public-bucket uploads set `Cache-Control: public, max-age=31536000, immutable`
  (services upload, avatar, seed). Filenames are content-versioned (random hash per upload),
  so each URL is immutable — repeat visitors load from browser cache (no S3 egress / faster)
  and **changing** an image yields a NEW url that dodges the cache, so there's never staleness.
  When adding a new S3 upload path, set this header too. Private booster docs
  (`lib/boosterDocsS3.ts`, `whaleabyss-private`) are auth-streamed and deliberately NOT cached
  `public`. Service card images render as CSS `background-image` (fetched straight from S3, not
  via `next/image`), so this header is what governs their caching.

**Auth Rate Limiting (brute-force / email-bombing protection):**
- `lib/rateLimit.ts` — in-memory sliding-window limiter. Exports `checkRateLimit`
  (peek, no record), `recordRateLimitHit`, `resetRateLimit`, and `getClientIp`
  (reads `X-Forwarded-For`/`X-Real-IP`; accepts a `Headers` object **or** the plain
  header map NextAuth passes to `authorize`).
- **Single-instance assumption:** state lives in the Node process heap, sized for the
  current pm2 **fork-mode** (one process, one VM) deployment. It resets on every
  deploy/restart and is per-process. **If the app is ever scaled to pm2 cluster mode
  or multiple VMs, this MUST move to a shared store (Redis/Postgres)** — the API hides
  the storage so only this file changes.
- Applied at three entry points (limits per 15-min window):
  - `send-otp`: 5/email + 20/IP, checked **after** the captcha so the budget only counts
    real sends (not unsolved probes).
  - `forgot-password`: 3/email + 15/IP.
  - login (`authorize` in `[...nextauth]`): 8/(IP+account) + 30/IP, counting **only failed
    attempts** and clearing them on success (a user who fumbles their password isn't locked out).
    Throws the stable code `"RATE_LIMITED"`; `components/AuthModal.tsx` maps it to a distinct
    Russian message while keeping the generic "Неверный email или пароль" for normal failures
    (no account enumeration).
- Per-email/account keys are the real protection (IPs are spoofable via `X-Forwarded-For`);
  per-IP is defense-in-depth.

**General API Rate Limiting (cost/abuse protection):**
- `lib/apiRateLimit.ts` — ergonomic layer over `lib/rateLimit.ts` for non-auth endpoints.
  `enforceRateLimit(req, bucket, tier, identifier?)` returns a ready 429 `NextResponse`
  (with `Retry-After`) or `null` to proceed; drop it at the top of a handler in two lines.
- **Identity:** keyed by **user id when authenticated** (stable, NAT-proof — many RU users
  share one mobile-carrier IP — and spoof-proof), falling back to **client IP** for anonymous
  calls. So user-keyed buckets ignore `X-Forwarded-For` spoofing; IP buckets are a backstop.
- **Tiers** (`RATE_TIERS`, per 60s per identity), tuned so a real session never trips them:
  `checkout` 10, `upload` 6 (avatar → S3 $$), `write` 6 (reviews/deletes), `promocode` 20
  (anti-brute-force), `auth` 8 (register/reset), `sync` 60 (cart), `read` 120 (public reads).
- **Applied at:** `POST /api/checkout`, `POST /api/user/avatar`, `POST|GET /api/reviews`,
  `POST /api/promocode/validate`, `POST /api/cart/sync`, `POST /api/auth/register`,
  `POST /api/auth/reset-password`, `GET /api/events`, `GET /api/services/[slug]/addons`.
  Machine-to-machine routes are intentionally **not** limited (FK/Telegram webhooks are
  signature/secret-auth'd and must stay reachable for retries; cron is bearer-auth'd;
  `/api/admin/*` + `/api/portal/*` are role-gated in `middleware.ts`).
- **Not in edge middleware on purpose:** Next.js middleware runs in the Edge runtime, a
  separate isolate that does NOT share the in-process counter Map with Node route handlers
  (and lacks `setInterval`). Putting the limiter there would be silently ineffective.
- **App-level limits can't stop a distributed flood** — the request already reached Node.
  The volumetric/cost backstop is an **nginx `limit_req` zone** in front of the app. Add to
  the prod nginx `server` block (state survives app restarts, shared machine-wide, stops the
  flood before it spends Node CPU):
  ```nginx
  # http{} block:
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req_status 429;
  # server{} block, around the API:
  location /api/ {
      limit_req zone=api burst=30 nodelay;   # ~10 req/s avg, bursts to 30
      proxy_pass http://127.0.0.1:3000;
  }
  ```
  For per-IP keys to be trustworthy, nginx must set `$remote_addr` into the forwarded chain
  (standard `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`) and `getClientIp`
  should read the **trusted** entry — today it reads the left-most (client-claimed) value, so
  IP buckets remain spoof-bypassable until that's hardened (user-keyed buckets already aren't).

**Security Headers & CSP (`next.config.ts`):**
- `poweredByHeader: false`. Enforced headers on all routes: HSTS (`max-age=63072000`,
  **no** `includeSubDomains`/`preload` — intentional, to avoid bricking a non-HTTPS subdomain),
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **CSP is currently `Content-Security-Policy-Report-Only`** (production only) — it reports
  violations to the browser console but does **not** block. To enforce, rename the header key to
  `Content-Security-Policy` after confirming the console is clean on: homepage (Metrika),
  registration captcha, checkout, and avatar upload.
- **⚠️ When adding any new external script/origin, inline script, or third-party widget, you MUST
  update `cspDirectives`** or it will be reported (and blocked once enforced). Currently whitelisted:
  Metrika (`mc.yandex.ru`/`.com`), SmartCaptcha (`smartcaptcha.cloud.yandex.ru` + `*.yandex.ru`
  frames), S3 images (`storage.yandexcloud.net`), `data:`/`blob:` (avatar/canvas). `script-src`
  uses `'unsafe-inline'` because the Metrika tag + Next hydration are inline (no nonces yet —
  nonce-based CSP is the documented next hardening step).
- The standalone `public/banner.html` (loads GSAP/Tailwind/Google-Fonts **CDNs**) is **excluded**
  from the CSP via a negative-lookahead source — don't remove that exclusion or the banner breaks.

### Database Schema Highlights

**Tables:**
- `users` - User accounts with role-based access (`passwordHash` is NULL for OAuth-created accounts)
- `oauth_accounts` - External login identities (provider + providerAccountId → userId), unique per provider account
- `services` - Boosting services with `isTestService` flag
- `categories` - Service categories
- `orders` - Orders with status enum: `pending`, `paid`, `in_progress`, `completed`, `cancelled`, `refunded`. Also `boosterId` (assigned качер, nullable FK) and `boosterEarning` (commission credited on completion; NULL = not yet credited, used as idempotency guard)
- `order_items` - Line items with `startDate`/`endDate` for subscription services
- `boosters` - Admin-managed booster (качер) roster (no login). `commissionPercent` (default 40), `balance` (accrued unpaid earnings), `status` (active/inactive), `inn`/`payoutDetails` for самозанятый payouts
- `cart_items` - Persisted cart for authenticated users
- `promocodes` & `promocode_usage` - Discount code system
- `reviews` - Service reviews with `isFake` flag for seeding
- `events` - Promotional events/contests
- `otps` - Email verification codes
- `password_reset_tokens` - Password reset flow

**Important:**
- Price fields stored as `varchar` or `decimal` - convert with `Number()` when displaying
- Always filter `isTestService: false` in public-facing queries
- Use `cache()` from React for expensive queries in Server Components

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Base URL (e.g., http://localhost:3000)
- `EMAIL_SERVER_*` - SMTP credentials (Zoho)
- `FREEKASSA_*` - Payment gateway credentials (SHOP_ID, SECRET_1, SECRET_2, API_KEY)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_ADMIN_CHAT_ID` - Admin chat ID for notifications
- `TELEGRAM_WEBHOOK_SECRET` - Shared secret echoed back by Telegram in the
  `X-Telegram-Bot-Api-Secret-Token` header; verified by `/api/telegram/webhook`
  to reject forged updates. Re-run `scripts/telegram/set_telegram_webhook.mjs`
  after setting/changing it
- `YANDEX_KEY_ID` & `YANDEX_SECRET_KEY` - S3 credentials
- `YANDEX_CLIENT_ID` & `YANDEX_CLIENT_SECRET` - Yandex ID OAuth app («Войти с
  Яндексом», app "Whale Abyss" at oauth.yandex.ru) — NOT the S3 keys above
- `NEXT_PUBLIC_SITE_URL` - Public site URL
- `CRON_SECRET` - Bearer token for `/api/cron/cleanup-orders` (order lifecycle cleanup)
- `NEXT_PUBLIC_YANDEX_SMARTCAPTCHA_CLIENT_KEY` - SmartCaptcha client/site key (browser widget)
- `YANDEX_SMARTCAPTCHA_SERVER_KEY` - SmartCaptcha server/secret key (token verification)

## Testing & Development

**Test Data:**
- Services with `isTestService: true` are hidden from public views
- Use admin panel at `/admin/testing` to create test orders
- Scripts in root: `cleanup_test_orders.mjs`, `seed_services.mjs`

**Telegram Bot:**
- Development: Use polling mode with `npm run bot:dev`
- Production: Webhook mode (set with `set_telegram_webhook.mjs`)
- Test with `/whoami` command to get chat ID

## Common Workflows

**Adding a new service field:**
1. Update `lib/schema.ts` - add column to `services` table
2. Create migration script (`.mjs`) in root
3. Run migration: `node migration_script.mjs`
4. Delete migration script
5. Rebuild: `npm run build`

**Creating an admin API endpoint:**
1. Create route in `/app/api/admin/[feature]/route.ts`
2. Middleware automatically protects the route
3. Add server-side role check for defense in depth

**Adding a new page:**
1. Create route in `/app/[route]/page.tsx`
2. Use Server Components by default
3. Create separate Client Component file (e.g., `PageClient.tsx`) if interactivity needed
4. Import and use in page: `<PageClient />`

## Path Aliases

TypeScript paths configured in `tsconfig.json`:
- `@/*` maps to project root
- Example: `import { db } from '@/lib/db'`

## Notes

- Prices are stored as strings in the database - always convert to numbers for calculations
- The site uses Russian language for user-facing content
- Admin panel is fully functional for managing services, orders, promocodes, reviews, events, and boosters
- Fuzzy search was removed - search is now handled server-side without Fuse.js
- Reusable form primitives: `components/Input.tsx`, `components/Textarea.tsx` (branded, rounded). Use the `components/TelegramIcon.tsx` brand glyph for any Telegram icon (tints via `currentColor`) — don't use the lucide `Send` icon for Telegram
- **Every search input is `components/CustomSearchField.tsx`** (wraps HeroUI `SearchField`; icon + clear button live inside a flex group). `fieldSize="sm"` = admin toolbar rows, `"md"` = public/portal/forms; optional `onFocus` for typeahead dropdowns (see `ManualOrderForm`). Styled via `.custom-search-field` in globals.css (admin-dark + site-dark covered). Never hand-roll an absolutely-positioned `Search` icon over a `CustomInput` — Tailwind `pl-*` loses to the unlayered `.custom-input--*` padding and the icon overlaps the text (the original /orders defect)
- **Every dropdown is `components/CustomSelect.tsx`; never a native `<select>`** (unstyleable OS chrome that breaks the brand). Full keyboard support (Enter/Space/arrows/Home/End/Esc) + `aria-activedescendant`, so it's a real replacement for the native control, not just a prettier one.
  - **Call sites pass layout only** — `className` for width, `fieldSize` for height (`sm` = admin toolbars, `md` = public/portal/forms), `ariaLabel` when there's no visible `<label>`. There are deliberately **no** `buttonClassName`/`menuClassName`/`optionClassName` escape hatches: they existed once and 18 call sites drifted into 4 different looks, which is exactly what "shared component" is supposed to prevent. The whole look lives in the `.custom-select__*` block in globals.css — edit there and every dropdown changes at once.
  - `role="listbox"` sits on the element that **directly** owns the option rows. Putting it on the outer menu (with the scroll container in between) silently drops every option from the accessibility tree.
- **Every date range is `components/CustomDateRangePicker.tsx`** (HeroUI `DateRangePicker` + `RangeCalendar`, locale pinned to `ru-RU`). Controlled with `yyyy-mm-dd` strings; props are `label`/`labelClassName`, `minDate`/`maxDate`, `fieldSize`, `months`, `clearable`. Styled by `.custom-date-range-picker` in globals.css.
  - **`minValue`/`maxValue` must be passed to BOTH `<DateRangePicker>` and `<RangeCalendar>`.** HeroUI takes the calendar as an explicit child, so the picker's bounds don't reach it — set it only on the root and every past day stays clickable while the field *looks* constrained.
  - The popover is portaled to `<body>`, so its rules are deliberately **unscoped**; only the trigger/input-group rules live under `.custom-date-range-picker`.
  - **Pass `months={2}` whenever `minDate` is ~today and the range runs forward** (the /service per-day picker). Near month-end the single-month view is a wall of disabled days with 1–2 clickable cells — a real customer read it as "only these two days can be chosen". Two-month mode also sets `pageBehavior="single"` (default paging jumps the whole visible span), per-grid «июль 2026 г.» captions (the shared heading slot only ever names the first month), and stacks vertically ≤640px.
  - The two-month width must be **explicit** (`.range-calendar--multi { width: 32.75rem }`): HeroUI sets `container-type: inline-size` on the calendar, and that containment makes `width: max-content` compute to 0.
  - **Day counts are inclusive**: 28/07 → 29/07 is **2** days. `ClientServicePage` computes `round(diff / 86400000) + 1` and that number becomes the cart quantity (`quantity × price/day` = total). A same-day range is 1 day. Don't "simplify" it to a plain difference.
- **The form primitives — `.custom-input`, `.custom-search-field`, `.custom-select`, `.custom-date-range-picker` — are one family** in globals.css: same fill (`#f1f5f9`), same `var(--r-card)` radius, same focus glow, same `--sm`(2rem)/`--md`(2.75rem) heights, and each has the admin-dark + site-dark palettes. Add a new control by following that block, not by inventing per-page classes

### Use the shared component — always

> **Never hand-roll a button or a chip. Not once, not "just for this admin page".**
> A `<button className="rounded-lg border px-3 py-1.5 text-xs font-bold …">` or a
> `<span className="rounded-full bg-amber-50 px-2.5 py-0.5 …">` is a **bug**, even when it
> looks fine in the screenshot: it misses the press animation, the focus ring, the
> disabled state, and both dark palettes, and it makes the next redesign an N-file
> find-and-replace. **Every button is `.btn-*` from globals.css. Every chip is HeroUI
> `Chip`.** This applies to the **admin panel** exactly as it does to `/`, `/services`
> and `/profile` — the admin is not a place where the rules are looser.

**Before building any new feature, screen or element, check this table first.** Reach for
the existing component; if it *almost* fits, add a prop to it. Only build something new
when nothing here applies — and then put it in `components/` with its look in globals.css,
never as one-off classes on a page. Three rounds of drift have already been paid for: 18
`CustomSelect` call sites in 4 different looks, an icon hand-positioned over an input on 4
pages (which overlapped the text on all of them), and a fresh admin page that shipped with
its own `<span>` chips and three bespoke button styles before being rewritten onto the
shared ones.

| Need | Use |
| --- | --- |
| Button | `.btn-primary` / `-secondary` / `-tertiary` / `-outline` / `-ghost` / `-danger` / `-danger-soft`, plus `.btn-sm` / `.btn-lg` / `.btn-icon-only` (HeroUI's button spec ported to our palette, globals.css) |
| Text / number / password field | `components/CustomInput.tsx` |
| Multi-line text | `components/Textarea.tsx` |
| Search field | `components/CustomSearchField.tsx` |
| Dropdown | `components/CustomSelect.tsx` (never a native `<select>`) |
| Date range | `components/CustomDateRangePicker.tsx` |
| Badge / tag / status pill | HeroUI `Chip` + `<Chip.Label>` (see `components/ServiceCard.tsx`) |
| Confirm / destructive prompt | `confirmDialog()` from `store/useConfirm.ts` |
| Telegram glyph | `components/TelegramIcon.tsx` (not the lucide `Send` icon) |
| Table with paging | `app/admin/_components/DataTable.tsx` |

Rules that apply to all of them: call sites pass **layout only** (`className` for width,
`fieldSize` for height) — the look belongs to the component; every new component needs the
**admin-dark and site-dark** palettes, because HeroUI's own tokens only flip on its `.dark`
selector which this site does not use; and a HeroUI component also needs its stylesheet
imported at the top of globals.css (`@import "@heroui/styles/components/<name>.css"`).

**Chip colours are `default | accent | danger | success | warning`** (`variant`:
`soft | secondary | primary | tertiary`) — there is deliberately no brand-blue chip, so a
neutral fact is `color="default" variant="secondary"` and only a signal that needs spotting
gets a colour. If a chip needs a shade the palette doesn't have, add it to the
`.chip--*` block in globals.css (with both dark palettes), never as inline classes on
one page.
- Admin list pages (`/admin/users`, `/admin/boosters`) share a filter+search pattern: `CustomSelect` dropdowns + a debounced `CustomSearchField`
- **Server-side pagination (orders + users lists):** `/admin/orders` and `/admin/users` do all
  filtering/sorting/paging in SQL — the API takes `?page&pageSize&sort&…&search` and returns
  `{ <rows>, total, page, pageSize }`, fetching only the current page (~10 rows + a `count(*)`)
  instead of the whole table (these lists grow unbounded). Filters are reproduced faithfully in
  SQL (`ILIKE` search incl. `uuid::text`, enum `::text =` for status/role, end-of-day-inclusive
  date range for orders). The shared `DataTable` opts in via a **`totalCount`** prop (server
  mode: `data` is already the current page; paginate against `totalCount`); omit it and it
  client-slices the full `data` array (boosters/services/reviews still do this — fine for those
  small, bounded sets). Client pages refetch on every page/filter/search change with a
  request-id guard (`reqIdRef`) so out-of-order responses can't clobber state, and pass
  `loading={loading && rows.length === 0}` so only the first load shows the full-table spinner.
