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
  - Client components use `"use client"` directive
- `/lib` - Shared utilities and core logic
  - `schema.ts` - Drizzle ORM schema definitions
  - `db.ts` - Database connection
  - `freekassa.ts` - Payment gateway integration
  - `telegramClient.ts` - Telegram bot setup and handlers
  - `email.ts` - Nodemailer email sending
  - `auth/` - NextAuth configuration
- `/components` - Reusable React components
- `/store` - Zustand stores (e.g., `useCart.ts`)
- `/scripts` - Utility scripts (e.g., `run-bot-polling.ts`)
- `/types` - TypeScript type definitions

### Key Architectural Patterns

**Authentication & Authorization:**
- NextAuth.js with credentials provider
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

**Boosters (качеры) & Commission Payouts:**
- `boosters` table is a manually-managed roster — **no login/registration**. Admins
  add/edit boosters at `/admin/boosters` (list with filter+search), `/admin/boosters/new`,
  and `/admin/booster/[boosterId]` (detail + edit modal). The existing `booster` user role
  is unrelated and unused by this registry.
- Orders link to a booster via `orders.boosterId` (nullable FK). Assigned from the **"Бустер"**
  column on `/admin/orders` and the dashboard recent-orders table, via the shared
  `app/admin/_components/OrderBoosterCell.tsx`:
  - unassigned + status `paid`/`in_progress` → "Назначить" button (opens `AssignBoosterModal`);
    first assignment also flips the order to `in_progress`.
  - already assigned → name links to the booster + "Сменить" pencil (re-assign **without**
    changing status).
  - status `cancelled`/`pending` → shows "—" (no assignment offered).
- **40/60 split:** on completion, `lib/boosterPayout.ts` → `creditBoosterForCompletedOrder()`
  credits `totalPrice * commissionPercent / 100` (default 40%) to `booster.balance`. The
  amount is written to `orders.boosterEarning` which doubles as an **idempotency guard**
  (credit happens exactly once). Called from both the admin order PATCH and the Telegram
  completion callback. **Does not touch revenue** — the dashboard sums `orders.totalPrice`.
- Assignment status logic lives in `PATCH /api/admin/orders/[id]` (accepts `status` and/or
  `boosterId`); re-assignment leaves status untouched.

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

### Database Schema Highlights

**Tables:**
- `users` - User accounts with role-based access
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
