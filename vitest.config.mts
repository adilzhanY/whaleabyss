import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // No @vitejs/plugin-react: its current release peer-depends on Babel 8 while
  // the app tree is on Babel 7. Tests don't need fast-refresh - vitest's own
  // transformer compiles TSX with the automatic runtime just fine.
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
    globals: false,
    // On the dev machine DATABASE_URL points at the PRODUCTION database through
    // an SSH tunnel, and lib/db.ts builds a pg.Pool at module scope. Force every
    // test process onto a sentinel that refuses instantly (port 1 = ECONNREFUSED)
    // so a stray real import of @/lib/db can never reach production. This is
    // defence in depth behind the per-suite vi.mock('@/lib/db'); the dbGuard
    // canary test pins it. See docs/testing/TEST_PLAN.md §1.1.
    env: { DATABASE_URL: "postgres://vitest:vitest@127.0.0.1:1/blocked" },
    // The first makeTestDb() in a file cold-boots a PGlite WASM instance and
    // pushes the whole schema; with 37 files running in parallel (and on slow
    // 2-core CI runners) that can exceed the 5 s default and flake — observed
    // locally on the one suite that boots inside it() rather than beforeEach.
    // Timeouts are ceilings, not waits: passing tests are not slowed. This
    // suite is a BLOCKING deploy gate, so it must never fail on timing.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
