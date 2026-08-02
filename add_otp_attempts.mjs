/**
 * Throwaway migration: give `otps` an attempt counter so a wrong registration
 * code costs something. Idempotent (IF NOT EXISTS), safe to re-run.
 *
 *   node add_otp_attempts.mjs
 *
 * Existing rows default to 0, which is correct — they simply start their budget
 * now. Rows live 15 minutes, so the whole table turns over almost immediately.
 *
 * Delete this file once it has been run (see CLAUDE.md → Database Management).
 */
import 'dotenv/config';
import pg from 'pg';

const connectionString = (process.env.DATABASE_URL ?? '').replace(/"/g, '');
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(2);
}

const pool = new pg.Pool({ connectionString });

try {
  await pool.query(`
    ALTER TABLE otps
      ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0
  `);
  const { rows } = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
     WHERE table_name = 'otps' AND column_name = 'attempts'
  `);
  console.log(rows.length ? rows[0] : 'FAILED: column not present after ALTER');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
