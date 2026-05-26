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
