/**
 * Throwaway migration: normalise identity emails to lowercase + trimmed, then
 * add a CHECK so it can't regress. Run with `--check` first — that mode is
 * READ-ONLY and reports collisions without touching anything.
 *
 *   node normalize_emails.mjs --check    # read-only report
 *   node normalize_emails.mjs --apply    # perform the migration
 *
 * Why the check matters: `users.email` is UNIQUE. If both `User@x.ru` and
 * `user@x.ru` exist as separate accounts, the UPDATE fails on the constraint —
 * those pairs are real distinct accounts (possibly with orders) and have to be
 * resolved by a human, not by this script.
 *
 * Delete this file once it has been run (see CLAUDE.md → Database Management).
 */
import 'dotenv/config';
import pg from 'pg';

const mode = process.argv.includes('--apply') ? 'apply'
  : process.argv.includes('--check') ? 'check'
  : null;
if (!mode) {
  console.error('Pass --check (read-only) or --apply.');
  process.exit(2);
}

const connectionString = (process.env.DATABASE_URL ?? '').replace(/"/g, '');
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(2);
}

const pool = new pg.Pool({ connectionString });

const norm = (col) => `lower(btrim(${col}))`;

async function report(client) {
  const out = {};

  for (const table of ['users', 'otps', 'password_reset_tokens']) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM ${table} WHERE email <> ${norm('email')}`
    );
    out[table] = { needsUpdate: rows[0].n };
  }

  // Distinct accounts that would collide on the UNIQUE constraint.
  const { rows: userCollisions } = await client.query(`
    SELECT ${norm('email')} AS normalized,
           count(*)::int    AS n,
           array_agg(email ORDER BY created_at) AS variants,
           array_agg(id::text ORDER BY created_at) AS ids
      FROM users
     GROUP BY 1
    HAVING count(*) > 1
     ORDER BY 2 DESC
  `);
  out.users.collisions = userCollisions;

  // These two are keyed by email (PRIMARY KEY) but hold short-lived rows —
  // 15 min for an OTP, 1 h for a reset token — so a colliding pair is safe to
  // drop rather than merge.
  for (const table of ['otps', 'password_reset_tokens']) {
    const { rows } = await client.query(`
      SELECT ${norm('email')} AS normalized, count(*)::int AS n
        FROM ${table} GROUP BY 1 HAVING count(*) > 1
    `);
    out[table].collisions = rows;
  }

  const { rows: check } = await client.query(`
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'users'::regclass AND conname = 'users_email_lowercase'
  `);
  out.checkConstraintPresent = check.length > 0;

  return out;
}

const client = await pool.connect();
try {
  const before = await report(client);
  console.log('--- current state ---');
  console.dir(before, { depth: null });

  if (mode === 'check') {
    const blocked = before.users.collisions.length > 0;
    console.log(
      blocked
        ? `\nBLOCKED: ${before.users.collisions.length} case-variant user account pair(s). ` +
          'Resolve these by hand (decide which row survives and where its orders go) before --apply.'
        : '\nNo user collisions — safe to run with --apply.'
    );
    process.exit(blocked ? 1 : 0);
  }

  if (before.users.collisions.length > 0) {
    console.error('\nRefusing to apply: user email collisions exist. Resolve them first.');
    process.exit(1);
  }

  await client.query('BEGIN');

  // Short-lived rows: drop the losers of a collision, keeping the newest.
  for (const table of ['otps', 'password_reset_tokens']) {
    const { rowCount } = await client.query(`
      DELETE FROM ${table} a
       USING ${table} b
       WHERE ${norm('a.email')} = ${norm('b.email')}
         AND a.email <> b.email
         AND a.created_at < b.created_at
    `);
    if (rowCount) console.log(`${table}: dropped ${rowCount} colliding row(s)`);
  }

  for (const table of ['users', 'otps', 'password_reset_tokens']) {
    const { rowCount } = await client.query(
      `UPDATE ${table} SET email = ${norm('email')} WHERE email <> ${norm('email')}`
    );
    console.log(`${table}: normalised ${rowCount} row(s)`);
  }

  // The guard. A non-normalised write now fails loudly instead of silently
  // creating an account nobody can log into.
  await client.query(`
    ALTER TABLE users
      ADD CONSTRAINT users_email_lowercase
      CHECK (email = lower(btrim(email)))
  `);
  console.log('users: added CHECK users_email_lowercase');

  await client.query('COMMIT');

  console.log('\n--- after ---');
  console.dir(await report(client), { depth: null });
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Migration failed, rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
