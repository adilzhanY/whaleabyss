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
- After schema changes: Always run `npm run build` to refresh TypeScript types
- Use `IF NOT EXISTS` in migrations for idempotency
- Strip quotes from `DATABASE_URL`: `.replace(/"/g, '')`

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

**Image Uploads:**
- Yandex Cloud S3 via `@aws-sdk/client-s3`
- Images stored in `whaleabyss-bucket`
- Remote pattern configured in `next.config.ts`

### Database Schema Highlights

**Tables:**
- `users` - User accounts with role-based access
- `services` - Boosting services with `isTestService` flag
- `categories` - Service categories
- `orders` - Orders with status enum: `pending`, `paid`, `in_progress`, `completed`, `cancelled`, `refunded`
- `order_items` - Line items with `startDate`/`endDate` for subscription services
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
- `YANDEX_KEY_ID` & `YANDEX_SECRET_KEY` - S3 credentials
- `NEXT_PUBLIC_SITE_URL` - Public site URL
- `CRON_SECRET` - Bearer token for `/api/cron/cleanup-orders` (order lifecycle cleanup)

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
- Admin panel is fully functional for managing services, orders, promocodes, reviews, and events
- Fuzzy search was removed - search is now handled server-side without Fuse.js
