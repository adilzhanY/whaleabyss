// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeTestDb } from "@/test/utils/pgliteDb";
import { services } from "@/lib/schema";
import { eq } from "drizzle-orm";

describe("makeTestDb smoke test", () => {
  it("creates the real schema and round-trips a row", async () => {
    const { db } = await makeTestDb();
    await db.insert(services).values({
      slug: "smoke",
      title: "Smoke",
      price: "1000.00",
    });
    const rows = await db.select().from(services).where(eq(services.slug, "smoke"));
    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBe("1000.00");
    expect(rows[0].isTestService).toBe(false);
  });

  it("isolates instances — a second db is empty", async () => {
    const { db } = await makeTestDb();
    const rows = await db.select().from(services);
    expect(rows).toHaveLength(0);
  });
});
