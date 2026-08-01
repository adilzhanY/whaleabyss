// @vitest-environment node
import { describe, it, expect } from "vitest";
import { isAddonChoice, isQuestGatedAndUndeclared } from "@/lib/addonChoice";

// The single shared predicate behind the /api/checkout 409 gate AND the Telegram
// warning — they must never drift. Zero mocks. See TEST_PLAN §B1.
const LINKED = ["quest-a", "quest-b"];
const set = (...ids: string[]) => new Set(ids);

describe("isQuestGatedAndUndeclared truth table", () => {
  const cases: {
    n: number;
    linked: string[] | undefined;
    choice: string | null | undefined;
    ordered: Set<string>;
    expected: boolean;
  }[] = [
    { n: 1, linked: undefined, choice: "quests", ordered: set(), expected: false },
    { n: 1, linked: [], choice: "quests", ordered: set(), expected: false },
    { n: 2, linked: LINKED, choice: "completed", ordered: set(), expected: false },
    { n: 3, linked: LINKED, choice: "self", ordered: set(), expected: false },
    { n: 4, linked: LINKED, choice: "quests", ordered: set("quest-a"), expected: false },
    // #5 — the delete-the-quest-lines regression (incident 2).
    { n: 5, linked: LINKED, choice: "quests", ordered: set(), expected: true },
    { n: 6, linked: LINKED, choice: null, ordered: set("quest-a"), expected: false }, // legacy tolerance
    { n: 7, linked: LINKED, choice: undefined, ordered: set(), expected: true },
    { n: 8, linked: LINKED, choice: "paid", ordered: set(), expected: true }, // garbage = undeclared
    { n: 8, linked: LINKED, choice: "", ordered: set(), expected: true },
  ];

  for (const c of cases) {
    it(`#${c.n} linked=${JSON.stringify(c.linked)} choice=${JSON.stringify(
      c.choice
    )} ordered=${[...c.ordered].join(",") || "∅"} → ${c.expected}`, () => {
      expect(isQuestGatedAndUndeclared(c.linked, c.choice, c.ordered)).toBe(c.expected);
    });
  }
});

describe("isAddonChoice whitelist — guards what /api/cart/sync may store", () => {
  it("accepts the three positive values", () => {
    expect(isAddonChoice("completed")).toBe(true);
    expect(isAddonChoice("self")).toBe(true);
    expect(isAddonChoice("quests")).toBe(true);
  });
  it("rejects everything else", () => {
    for (const v of ["COMPLETED", "", null, undefined, "yes", 42, {}]) {
      expect(isAddonChoice(v)).toBe(false);
    }
  });
});
