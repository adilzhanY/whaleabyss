import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api";
import { is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { getTableName } from "drizzle-orm";
import * as schema from "@/lib/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * A real Postgres, in memory, in-process — no socket, no file, no VM.
 *
 * The money invariants under test (the conditional `UPDATE ... WHERE ...
 * RETURNING` claims for the paid transition, email sends and `boosterEarning`,
 * plus the cleanup `WHERE` clauses) ARE SQL predicates. A chainable drizzle
 * stub would assert the stub's behaviour; PGlite runs the actual Postgres
 * semantics. See docs/testing/TEST_PLAN.md §1.2.
 *
 * Vitest isolates each test file in its own module registry, so the cache below
 * is PER FILE: the schema is pushed once and every `makeTestDb()` call after
 * that just TRUNCATEs all tables and hands back the same instance. This keeps
 * per-test isolation while avoiding two problems that a fresh-instance-per-test
 * approach caused: re-running drizzle-kit's `pushSchema` for every test (slow),
 * and spinning up hundreds of concurrent PGlite WASM instances (a transient
 * init failure under that load made the suite flaky).
 */
let cached: { db: TestDb; client: PGlite; tables: string[] } | null = null;

export async function makeTestDb(): Promise<{ db: TestDb; client: PGlite }> {
  if (!cached) {
    const client = new PGlite();
    const db = drizzle(client, { schema });
    const { apply } = await pushSchema(schema, db as never);
    await apply(); // creates the real tables from lib/schema.ts
    const tables = Object.values(schema)
      .filter((v) => is(v, PgTable))
      .map((t) => `"${getTableName(t as PgTable)}"`);
    cached = { db, client, tables };
  }
  // Reset between tests — one statement, CASCADE handles the FKs.
  await cached.client.query(
    `TRUNCATE ${cached.tables.join(", ")} RESTART IDENTITY CASCADE`
  );
  return { db: cached.db, client: cached.client };
}
