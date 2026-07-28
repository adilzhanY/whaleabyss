# The learning database

Anki, but for programming, and Claude does the grading.

Anki works because you don't decide what to review — the schedule does, and it hides
things exactly long enough that recalling them is hard. This is the same machine, with
one difference: **you don't grade yourself.** Claude grades you on whether you actually
answered correctly, which removes the main way self-graded systems rot.

## Files

| file | what it is |
|---|---|
| `concepts.jsonl` | current state — one line per concept, rewritten on change |
| `log.jsonl` | append-only history — every add, every grade, every session note, with a timestamp |
| `bin/learn.mjs` | the CLI that does the scheduling maths |

`concepts.jsonl` answers *"what should I review now?"*. `log.jsonl` answers *"how did I
get here?"* — it is never edited, only appended, so the whole learning history stays
recoverable even if the state file is rebuilt.

## What counts as one concept

**One concept = one thing that can be tested with a single question.**

Too big (`javascript`) and it never becomes "known". Too small (`the letter g in a regex
flag`) and there are five hundred cards. The right size is roughly what fits in one
paragraph of explanation:

```
js.string-immutability     ✅ testable in one question
js.strings                 ❌ too big
regex.g-flag               ✅
regex                      ❌ too big
```

IDs are namespaced by area: `js.` `ts.` `regex.` `react.` `next.` `db.` `git.` `css.`

## The five fields that matter

```jsonc
{
  "id": "js.string-immutability",
  "status": "shaky",         // new → learning → known, or shaky after a failure
  "interval": 0,             // days until the next review
  "ease": 2.3,               // how fast the interval grows; drops when you struggle
  "lapses": 1,               // how many times you've gotten it wrong. Weak spots.
  "due": "2026-07-26T…",     // when it comes back
  "note": "Tried newList[i][0].toUpperCase() expecting in-place change."
}
```

`note` is the most valuable field and the one a normal SRS doesn't have. It records
**how you got it wrong**, in your own case, so the next question can target the exact
misunderstanding instead of asking the same generic thing again.

## Grades

Claude picks these from your actual answer, not from how you felt about it.

| grade | meaning | effect |
|---|---|---|
| `again` | wrong | interval → 0, comes back next session, `lapses++`, marked shaky |
| `hard` | right, but you struggled or needed a hint | interval grows slowly, ease drops |
| `good` | right | interval × ease (1d → 3d → ~7d → ~18d …) |
| `easy` | instant, no thought | interval grows faster, ease rises |

A concept becomes `known` after three clean reps. Anything with `lapses > 0` stays
`shaky` until it's been right three times in a row — failures are remembered.

## Commands

```bash
node .claude/learn/bin/learn.mjs due          # what to review right now
node .claude/learn/bin/learn.mjs stale        # least recently touched, ignoring schedule
node .claude/learn/bin/learn.mjs stats        # counts + weak spots
node .claude/learn/bin/learn.mjs show <id>    # full record incl. the note
node .claude/learn/bin/learn.mjs list --tag regex
node .claude/learn/bin/learn.mjs grade js.slice good --note "used it unaided"
node .claude/learn/bin/learn.mjs add react.usestate --topic "..." --source components/Toast.tsx
```

`due` obeys the schedule. `stale` ignores it and asks "what haven't I touched in ages?" —
useful for catching things that were graded `easy` early and then quietly forgotten.

## How a session runs

**At the start**, Claude runs `due`, picks one or two concepts, and asks a question or
sets a tiny piece of code — before any project work. Two minutes, not a lesson. If
nothing is due, it asks about the stalest thing instead.

**At the end**, Claude grades everything that came up and adds any new concept it taught,
with a note about what you did or didn't get.

If you're mid-something and don't want the warm-up, say "skip review" and it moves on.
