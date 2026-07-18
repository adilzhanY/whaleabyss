# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
    can't reach. The build still runs on the VM in the `deploy` job (`git pull && npm
    install && npm run build && pm2 restart`), so a build that only fails on the VM can
    still leave prod half-broken (atomic deploy + rollback is a known TODO).
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
- Middleware (`middleware.ts`) protects `/admin/*` and `/api/admin/*` routes
- Admin routes have two-layer protection: Edge middleware + server-side checks

**Cart Management:**
- Zustand store with localStorage persistence (`store/useCart.ts`)
- Cart syncs to database `cart_items` table for authenticated users
- Cart persists across sessions via `persist` middleware

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
  plain add. The client's choice — tick quests (added as separate cart lines), «задания
  уже выполнены», or «пройду их сам» — travels cart → `cart_items.addon_choice` (sync/load)
  → checkout → `order_items.addon_choice`, and is rendered in the admin panel and the
  Telegram order notification so the booster knows whether the gating quests are on the client.
- **Incident (order `f216229e`, 2026-07-12):** a paid order for a quest-gated service
  arrived with `addon_choice = NULL` and no quest lines — the admin notification showed
  nothing and there was no way to tell what the client wanted. Diagnosis: code and data
  were fully intact (addon links present, prod API returning them); the root cause was the
  add-to-cart flow's *silent fallback* — any single failed `/addons` fetch (mobile network
  blip, transient 500/429) skipped the modal and did a plain add, losing the declaration
  with no trace. Lesson: **a graceful degradation on a revenue-relevant path must never be
  silent** — degrade for the user, but surface the degradation to the operator.
- Fix (commit `cdebec0`): (1) the addons fetch retries ×3 with backoff before falling back
  (a definitive empty response still skips the modal instantly); (2) the Freekassa-notify
  Telegram message now detects the bad shape server-side — ordered service has
  `service_addons` links but neither an `addon_choice` nor any of its quest services in the
  order — and appends «❗ Услуга с заданиями, но клиент не сделал выбор — уточните у
  клиента». The same NULL shape can also be produced legitimately (client ticked quests in
  the modal, then deleted the quest lines in the cart), which the flag covers too; Metrika
  Webvisor session replay is the tiebreaker when it matters.

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
- Admin list pages (`/admin/users`, `/admin/boosters`) share a filter+search pattern: `CustomSelect` dropdowns + a debounced `Input` with a `Search` icon
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
