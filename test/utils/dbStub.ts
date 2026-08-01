import { vi } from "vitest";

/**
 * A chainable, recording stand-in for the drizzle `db` object.
 *
 * Cheaper than PGlite where the question is "what did the code call / insert /
 * update", not "what did SQL actually do". Used across tranche C. Drizzle query
 * builders are thenable — awaiting a chain runs it — so this proxy returns
 * itself from every builder method and resolves each awaited chain from a
 * per-test FIFO queue of canned results. See docs/testing/TEST_PLAN.md §1.3.
 *
 * Example:
 *   const { db, queueRows, inserts, updates } = makeDbStub();
 *   queueRows([{ id: 'u1', passwordHash: 'x' }]); // next awaited chain resolves to this
 *   ...run code under test...
 *   expect(inserts).toContainEqual({ table: 'users', values: {...} });
 */

export interface RecordedInsert {
  values: unknown;
}
export interface RecordedUpdate {
  set: unknown;
}

type Result = unknown;

export interface DbStub {
  /** The object to hand to `vi.mock('@/lib/db', () => ({ db }))`. */
  db: Record<string, unknown>;
  /** Push one result onto the FIFO — the value the next awaited chain yields. */
  queueRows: (rows: Result) => void;
  /** Reset the queue and all recordings. */
  reset: () => void;
  /** Recorded `.values(...)` payloads, in call order. */
  inserts: RecordedInsert[];
  /** Recorded `.set(...)` payloads, in call order. */
  updates: RecordedUpdate[];
  /** How many times `db.delete(...)` was invoked. */
  deleteCalls: { table: unknown }[];
  /** How many times a fresh `db.select(...)` chain was started. */
  selectCount: () => number;
  /** How many times `db.transaction(cb)` was invoked. */
  txCount: () => number;
}

export function makeDbStub(): DbStub {
  const queue: Result[] = [];
  const inserts: RecordedInsert[] = [];
  const updates: RecordedUpdate[] = [];
  const deleteCalls: { table: unknown }[] = [];
  let selects = 0;
  let txs = 0;

  // One chainable/thenable object. Every builder method returns it; awaiting it
  // shifts the next queued result (or [] if the queue is empty).
  function makeChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {};

    const passthrough = [
      "from",
      "where",
      "leftJoin",
      "innerJoin",
      "rightJoin",
      "orderBy",
      "groupBy",
      "having",
      "limit",
      "offset",
      "for",
      "onConflictDoNothing",
      "onConflictDoUpdate",
    ];
    for (const m of passthrough) {
      chain[m] = vi.fn(() => chain);
    }

    chain.values = vi.fn((v: unknown) => {
      inserts.push({ values: v });
      return chain;
    });
    chain.set = vi.fn((v: unknown) => {
      updates.push({ set: v });
      return chain;
    });
    chain.returning = vi.fn(() => chain);

    // Thenable: `await chain` resolves to the next queued result.
    chain.then = (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) => {
      try {
        const value = queue.length ? queue.shift() : [];
        return Promise.resolve(value).then(resolve, reject);
      } catch (e) {
        return Promise.reject(e).then(resolve, reject);
      }
    };

    return chain;
  }

  const db: Record<string, unknown> = {
    select: vi.fn(() => {
      selects++;
      return makeChain();
    }),
    insert: vi.fn(() => makeChain()),
    update: vi.fn(() => makeChain()),
    delete: vi.fn((table: unknown) => {
      deleteCalls.push({ table });
      return makeChain();
    }),
    transaction: vi.fn(async (cb: (tx: unknown) => unknown) => {
      txs++;
      // The tx is another recording stub sharing this queue and recordings.
      const tx: Record<string, unknown> = {
        select: vi.fn(() => {
          selects++;
          return makeChain();
        }),
        insert: vi.fn(() => makeChain()),
        update: vi.fn(() => makeChain()),
        delete: vi.fn((table: unknown) => {
          deleteCalls.push({ table });
          return makeChain();
        }),
      };
      return cb(tx);
    }),
    execute: vi.fn(() => {
      return queue.length ? queue.shift() : [];
    }),
  };

  return {
    db,
    queueRows: (rows) => queue.push(rows),
    reset: () => {
      queue.length = 0;
      inserts.length = 0;
      updates.length = 0;
      deleteCalls.length = 0;
      selects = 0;
      txs = 0;
    },
    inserts,
    updates,
    deleteCalls,
    selectCount: () => selects,
    txCount: () => txs,
  };
}
