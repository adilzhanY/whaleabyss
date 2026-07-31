-- Migration history for Whale Abyss (genshin_abyss)
-- Append a comment + the SQL for every schema change applied to the DB.

-- 2026-05-25: boosters roster (manually managed by admins, no login)
CREATE TYPE booster_status AS ENUM ('active', 'inactive');
CREATE TABLE IF NOT EXISTS boosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  birth_date timestamptz,
  telegram_username varchar(255),
  inn varchar(12),
  payout_details varchar(255),
  commission_percent integer NOT NULL DEFAULT 40,
  balance decimal(10, 2) NOT NULL DEFAULT '0',
  status booster_status NOT NULL DEFAULT 'active',
  note text,
  start_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2026-05-25: link orders to an assigned booster (nullable; set via "Назначить")
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS booster_id uuid
  REFERENCES boosters(id) ON DELETE SET NULL;

-- 2026-05-25: commission credited to the booster on order completion.
-- NULL = not yet credited; set exactly once. Does not affect revenue accounting.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS booster_earning numeric(10, 2);

-- 2026-05-25: one-time backfill — credit commission for orders that were
-- completed BEFORE the payout feature existed. Idempotent (only touches rows
-- where booster_earning IS NULL); preserves manual balance edits.
WITH credited AS (
  UPDATE orders o
  SET booster_earning = ROUND(o.total_price * b.commission_percent / 100.0, 2)
  FROM boosters b
  WHERE o.booster_id = b.id
    AND o.status = 'completed'
    AND o.booster_earning IS NULL
  RETURNING o.booster_id, o.booster_earning
),
sums AS (
  SELECT booster_id, SUM(booster_earning) AS total FROM credited GROUP BY booster_id
)
UPDATE boosters bo
SET balance = bo.balance + s.total, updated_at = now()
FROM sums s
WHERE bo.id = s.booster_id;

-- 2026-05-26: Record payment method + flag test-flow orders (admin testing of
-- the new SBP/card FreeKassa flow). Additive, nullable — safe/backward-compatible.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method varchar(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test_payment boolean DEFAULT false;

-- 2026-06-05: Quest-addon upsell system (SERVICE_ADDONS.md). New link table
-- parent (exploration) service -> addon (quest) service, plus the client's
-- declaration from the upsell modal ('completed' | 'self') on cart/order items.
CREATE TABLE IF NOT EXISTS service_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  addon_service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT service_addons_parent_addon_unique UNIQUE (parent_service_id, addon_service_id)
);
CREATE INDEX IF NOT EXISTS service_addons_parent_idx ON service_addons (parent_service_id);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS addon_choice varchar(20);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS addon_choice varchar(20);

-- 2026-06-05: Cart dedupe guard. Concurrent /api/cart/sync requests interleaved
-- their delete+insert cycles and duplicated rows (duplicate React keys in the
-- cart UI). One line per service per user, insert with ON CONFLICT DO NOTHING.
DELETE FROM cart_items a USING cart_items b
WHERE a.user_id = b.user_id AND a.service_id = b.service_id AND a.ctid > b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_service_unique
ON cart_items (user_id, service_id);

-- 2026-06-06: Adventure Rank (Ранг приключений) replaces the in-game nickname
-- at checkout/profile. users.game_username is kept as a legacy column (old
-- data stays readable) but no active flow writes it anymore. AR will later
-- gate services that require a minimum rank.
ALTER TABLE users ADD COLUMN IF NOT EXISTS adventure_rank integer;

-- 2026-06-07: Booster documents (договор + скан паспорта). Files live in the
-- PRIVATE bucket whaleabyss-private (the main bucket is public-read — even
-- object ACL 'private' is overridden there, verified). Access only by
-- streaming through the admin-guarded API route; no public URLs ever exist.
DO $$ BEGIN
  CREATE TYPE booster_doc_type AS ENUM ('agreement', 'passport');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS booster_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booster_id uuid NOT NULL REFERENCES boosters(id) ON DELETE CASCADE,
  doc_type booster_doc_type NOT NULL,
  s3_key varchar(512) NOT NULL,
  file_name varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT booster_documents_booster_doc_type_unique UNIQUE (booster_id, doc_type)
);

-- 2026-06-07: Booster portal (/portal). boosters.user_id links a roster row to
-- a site account (users.role flips to 'booster' on link — the previously
-- unused enum value). orders.booster_online is the per-order «я на аккаунте»
-- toggle, shown to the customer as a badge.
ALTER TABLE boosters
ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS booster_online boolean NOT NULL DEFAULT false;

-- 2026-06-25: admin-seeded fake reviews. Fake reviews (is_fake=true, user_id NULL)
-- now carry their own author identity in columns instead of a hardcoded id→name
-- map in app/api/reviews/route.ts. author_avatar_url NULL → first-letter avatar.
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_fake boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author_name varchar(255),
  ADD COLUMN IF NOT EXISTS author_avatar_url varchar(512);
-- (data migration: backfilled the 20 legacy hardcoded fakes into the new columns
--  and inserted 3 new approved fake reviews — see migrate_fake_reviews.mjs history.)

-- 2026-07-01: spotlight a service in «Актуальное» without moving it out of its
-- native category. When true, getServiceCategories() also includes the service
-- in the actual category (keeping its native categorySlug for the detail page).
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS featured_in_actual boolean NOT NULL DEFAULT false;

-- 2026-07-02: "Войти с Яндексом" (OAuth via Yandex ID). OAuth identities live in
-- oauth_accounts (one user ↔ many providers); users created via OAuth have no
-- password, so password_hash becomes nullable (they can set one later via the
-- forgot-password flow).
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(32) NOT NULL,
  provider_account_id varchar(255) NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT oauth_accounts_provider_account_unique UNIQUE (provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS oauth_accounts_user_id_idx ON oauth_accounts(user_id);

-- 2026-07-31: quest artwork. Quests have no artwork of their own, so
-- scripts/covers/build-quest-covers.mjs generates a darkened region tile into
-- image_url, and quest_region stores the Genshin region resolved once from
-- service_addons (so unlinking an addon later cannot silently change the art).
-- The catalogue card draws its own typographic cover from quest_region
-- (components/QuestCover.tsx).
ALTER TABLE services ADD COLUMN IF NOT EXISTS quest_region varchar(32);

-- Same day, undone: cover_url held a generated 1200x750 typographic cover for
-- the catalogue card. It cannot work — that card's picture box is a fixed height
-- at a fluid width, so its aspect ratio changes with every breakpoint and column
-- count, and `background-size: cover` ate the sides of the quest name on a
-- 5-column desktop grid. Replaced by live rendering, which fits any shape.
ALTER TABLE services ADD COLUMN IF NOT EXISTS cover_url varchar(255);
ALTER TABLE services DROP COLUMN IF EXISTS cover_url;

-- 2026-07-31: image_fit. Some service artwork is a square item icon on a flat
-- white background, not a screenshot; the card's picture box is squarish and its
-- edges cut straight through such an icon («Прочее», «Задание легенд»,
-- «Задание Архонтов»). 'contain' shows the picture whole on a blurred copy of
-- itself instead. NULL keeps the old crop-to-fill behaviour.
-- Backfilled by scripts/covers/flag-icon-artwork.mjs.
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_fit varchar(10);
