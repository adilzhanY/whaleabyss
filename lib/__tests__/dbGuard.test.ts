// @vitest-environment node
import { describe, it, expect } from "vitest";

// Canary. On the dev machine DATABASE_URL points at the PRODUCTION database
// through an SSH tunnel; vitest.config.mts overrides it with a sentinel that
// refuses instantly. If this test ever fails, a test run could reach the real
// database — stop and fix the config before writing another line.
// See docs/testing/TEST_PLAN.md §1.1 and TEST_BEFORE_MERGE.md §3.3.
describe("test environment safety", () => {
  it("DATABASE_URL is the blocked sentinel, never the real database", () => {
    expect(process.env.DATABASE_URL).toBe(
      "postgres://vitest:vitest@127.0.0.1:1/blocked"
    );
  });
});
