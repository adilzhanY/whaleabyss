# TEST_BEFORE_MERGE.md

Pre-merge audit and work plan for `rebranding-v2` → `main`.

**Written:** 2026-08-01. **Status:** nothing below has been implemented yet — this document is
the plan a fresh session should pick up and execute.

**Context:** a push to `main` auto-deploys to production (https://whaleabyss.ru), so merging
this branch is a customer-facing release. Before that happens, six subagents read the whole
codebase as Senior Testers and reported per-area findings. This file records the decisions;
the detail lives in two companion documents:

| Document | Contents |
| --- | --- |
| **`docs/testing/AUDIT_FINDINGS.md`** | Security findings, secrets/PII scan results, repo-hygiene inventory, public-repo checklist, full per-area coverage map from all six agents |
| **`docs/testing/TEST_PLAN.md`** | The actual test specifications — every case, every mock, per tranche |

---

## 1. Decisions taken (2026-08-01)

These were chosen explicitly by the repo owner after reviewing the audit. Do not re-litigate
them; implement them.

| # | Question | Decision |
| --- | --- | --- |
| 1 | When to apply the pre-merge fixes | **Apply the fixes first, then merge to `main`.** |
| 2 | Which test tranches to write | **A (money), B (quest-gate), C (auth & security).** D/E/F stay in the backlog. |
| 3 | Repo cleanup | **Do all of it** — delete the dead scripts, add `.email-previews/` to `.gitignore`. |
| 4 | Portfolio repository | **Make the existing repository public**, after clearing the four checklist items in §5. (Not a separate fork.) |
| 5 | `npm test` in CI | **Yes — blocking step in the `verify` job.** |

Explicitly **out of scope** (backlog, see `docs/testing/TEST_PLAN.md` §5):
tranche D (cart & optimistic statuses), E (admin & portal), F (frontend components).

---

## 2. Merge verdict

**🟡 Merge is safe once §3 is done.**

No defect was found in the work this branch introduces (rebranding, celebration modals,
optimistic order statuses, email template system, exactly-once claims, Telegram button
removal). Everything blocking below is **pre-existing** and unrelated to the rebrand — the
audit simply surfaced it.

| Metric | Value |
| --- | --- |
| Security blockers found | 2 (both are log leaks, both pre-existing) |
| Hard-coded secrets in tracked files | **0** — every script reads `process.env` |
| Customer PII in tracked files | **0** — only `admin@test.com` / `test@example.com` |
| Existing tests | 5 files, 57 tests, all green in ~1.9 s, zero network |
| Tests planned (tranches A+B+C) | ~115 |

---

## 3. Step 1 — fixes to land BEFORE the merge

Four commits, roughly 40 minutes. Order matters only for the last one (it must not be
skipped before anyone writes a `lib/` test).

### 3.1 🔴 Remove the Freekassa secret from production logs

`lib/freekassa.ts` lines **357–359** print the full signature source string on **every**
payment webhook. That string embeds `FREEKASSA_SECRET_2` in plaintext, and two further lines
print the secret's length and first four characters. The secret is therefore sitting in pm2
logs on the production VM. Anyone with log access can forge a "заказ оплачен" webhook and
receive services for free.

```diff
- console.log('[Freekassa] Signature string:', signatureString);
- console.log('[Freekassa] SECRET_2 length:', secret2.length);
- console.log('[Freekassa] SECRET_2 first 4 chars:', secret2.substring(0, 4));
```

Lines 366–368 (`Expected signature` / `Received signature` / `Match`) may stay — those are
md5 hashes, not the secret.

> **Also rotate `FREEKASSA_SECRET_2`** in the Freekassa dashboard and in the prod `.env`
> after deploying this. The secret has been in the logs for as long as those lines existed;
> removing the log line does not un-leak what is already written. Old log files on the VM
> should be truncated too (`pm2 flush`).

### 3.2 🔴 Stop logging customer PII

`app/api/payment/freekassa/notify/route.ts` lines **44–79** log all request headers plus the
entire parsed notification payload, which includes `P_EMAIL` and `P_PHONE`. Replace with a
single line carrying only what is needed to trace a payment:

```ts
console.log('[Freekassa] notify', { order: data.MERCHANT_ORDER_ID, amount: data.AMOUNT });
```

### 3.3 🔴 Make it impossible for a test to reach the production database

On this machine `DATABASE_URL` points at the **production** database through an SSH tunnel,
and `lib/db.ts` constructs a `pg.Pool` at module scope. Today the tests happen not to import
`lib/db` — by convention only. The very first test written for `lib/orderCleanup.ts` (which
issues `DELETE`s) would run against production.

```ts
// vitest.config.mts
test: {
  environment: "jsdom",
  setupFiles: ["./vitest.setup.ts"],
  include: ["**/__tests__/**/*.test.{ts,tsx}"],
  globals: false,
  env: { DATABASE_URL: "postgres://vitest:vitest@127.0.0.1:1/blocked" }, // port 1 = instant ECONNREFUSED
},
```

Add the canary so nobody deletes it silently:

```ts
// lib/__tests__/dbGuard.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';

describe('test environment safety', () => {
  it('DATABASE_URL is the blocked sentinel, never the real database', () => {
    expect(process.env.DATABASE_URL).toBe('postgres://vitest:vitest@127.0.0.1:1/blocked');
  });
});
```

### 3.4 🟡 Repo cleanup (decision #3)

```bash
# .gitignore — add:
.email-previews/

# delete (git history keeps them):
git rm -r misc/
git rm seed_quest_services.mjs seed_service_addons.mjs
git rm scripts/test/test_pay.js scripts/test/test_db.mjs
git rm scripts/test/test-webhook.mjs scripts/test/test_webhook_update.mjs
git rm scripts/test/test_email.mjs scripts/test/test_freekassa_signature.mjs
```

**Keep:** `scripts/test/preview_emails.ts` (useful, no secrets), `scripts/test/test_email_claim.ts`
(documents the exactly-once claim), `scripts/test/cleanup_test_orders.mjs`,
`scripts/test/create_dummy_orders.ts`, `cleanup_stale_orders.mjs` (referenced by cron in
`CLAUDE.md`).

Why the deletions: `test_pay.js` and `test_db.mjs` write to the production database from a
developer machine; `seed_*.mjs` violate the repo's own `DB_RULES.md` ("delete the migration
script after running it"); `misc/` is scratch output. All of them read as clutter in a
repository meant to demonstrate engineering quality.

### 3.5 Verify, then merge

```bash
npx tsc --noEmit && npm test && npm run build
git checkout main && git merge rebranding-v2 && git push
```

Both DB migrations from this branch (`paidNotifiedAt`, `completedNotifiedAt`,
`paidEmailSentAt`, `completedEmailSentAt`) are **already applied to the live database**, so
the merge needs no extra deploy steps.

---

## 4. Step 2 — CI gate (decision #5)

`npm test` exists in `package.json` but is invoked nowhere. The `verify` job in
`.github/workflows/deploy.yml` gates only on `tsc --noEmit` (lint is `continue-on-error` due
to ~85 pre-existing errors). The suite needs no database and no secrets and runs in ~2 s.

```yaml
# .github/workflows/deploy.yml — job "verify", between Typecheck and Lint
- name: Unit tests
  run: npm test          # blocking: a failure skips the deploy job entirely
```

**No coverage threshold.** At this repo's size a percentage gate produces tests written to
satisfy the number. The value here is that each test is anchored to a real incident — which
is also the better story to tell in an interview.

> Pushing any change to `.github/workflows/*` requires a token with the `workflow` scope, or
> SSH-based git auth. A plain PAT is rejected.

---

## 5. Step 3 — making the repository public (decision #4)

The secrets scan across all 456 tracked files came back **clean**: no tokens, no connection
strings, no keys, no customer data. The risk of publishing is not credentials — it is
**operational reconnaissance** and one outdated document.

Clear these four before flipping the switch:

1. **`CLAUDE.md` + `.github/workflows/deploy.yml`** — production static IP `93.77.188.163`,
   SSH username `qantr`, VM sizing, the DB tunnel command, and full disaster-recovery
   runbooks. Move the infrastructure sections to a private note; leave the architecture
   sections (they are the interesting part).
2. **`CLAUDE.md`, again** — it candidly lists unfixed weaknesses: CSP is report-only,
   `X-Forwarded-For` makes IP rate-limit buckets spoofable, the limiter is in-process only.
   True and worth knowing internally; a to-do list for an attacker once public.
3. **`INTERVIEW_NOTE.md`** — describes an unfixed race condition in the payment webhook with
   file and line pointers. **That race is already fixed in this branch** (the atomic
   `pending → paid` transition), so the file is simply stale. Delete or rewrite it.
4. **`.claude/learn/*.jsonl`** — the owner's personal learning and mistake log. Not a secret,
   but not something to hand a recruiter. Add to `.gitignore` and `git rm --cached`.

> ⚠️ **Git history is not cleaned by editing the working tree.** The prod IP, the SSH
> username and `INTERVIEW_NOTE.md` remain readable in every historical commit. Options, in
> order of effort:
> - **Accept it** and treat the IP as public. It already is, in DNS — `whaleabyss.ru`
>   resolves to it. The real protections are the SSH key requirement and nginx, not secrecy.
>   The username `qantr` plus a public IP is a marginal help to a password-spray attacker,
>   and password auth should be disabled anyway (**verify `PasswordAuthentication no` in
>   `/etc/ssh/sshd_config` before publishing** — that single check neutralises most of this).
> - **Rewrite history** with `git filter-repo` — invasive, breaks every existing clone and
>   the deploy pipeline's assumptions.
>
> Recommendation: verify SSH key-only auth, accept the history, clean the working tree.

**Add a README** before publishing. The repository's genuinely impressive parts are invisible
without one: server-side price recomputation, the exactly-once claim pattern used uniformly
for emails and modals, the quest-gate server backstop written after two real revenue
incidents, the atomic webhook transition, and the optimistic-status registry. Point at the
tests as evidence — they are regression-anchored, not coverage theatre.

---

## 6. Step 4 — write the tests (decision #2: tranches A, B, C)

Full specifications: **`docs/testing/TEST_PLAN.md`**.

| Tranche | Area | Tests | Est. | Why first |
| --- | --- | --- | --- | --- |
| **A** | Money: checkout, Freekassa webhook, booster commission, promocodes, order cleanup | ~45 | ~6 h | A regression here loses money directly or produces an unpayable order |
| **B** | Quest-gate: the incident that happened **twice** (orders `f216229e`, `96162b2e`) | ~30 | ~4 h | Two paid orders already arrived unfulfillable; the server gate is the only real guarantee |
| **C** | Auth & security: login limiter, JWT-as-cache, OTP ordering, password reset, Telegram webhook secret, role matrix | ~40 | ~5 h | Zero coverage today; each flow is a documented design decision that a refactor can silently invert |

### The one production refactor these tests need

Nothing in tranches A–C requires touching application code, with one optional exception noted
in the plan (`inclusiveDayCount` extraction, which belongs to tranche F). Tranches A–C test
existing modules as they are.

### How the VM stays untouched

This was an explicit requirement. Every test runs inside the Node process — no HTTP server is
started, no request leaves the machine:

| External system | Seam |
| --- | --- |
| PostgreSQL (production, via tunnel) | `vi.mock('@/lib/db')` → drizzle over **PGlite** (in-memory Postgres) |
| SMTP (Zoho) | `vi.mock('@/lib/email')` — mandatory: the real module builds the transporter at import time |
| Freekassa API | `vi.stubGlobal('fetch')` + `vi.stubEnv` for the four `FREEKASSA_*` vars |
| Telegram | `vi.mock('@/lib/telegramClient')` |
| NextAuth | `vi.mock('next-auth/next')` + `vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))` |
| Route handlers | Plain exported async functions — call them directly with `new NextRequest(...)` |

**Why PGlite and not a drizzle chain mock:** the money invariants in this codebase *are* SQL
predicates — the conditional `UPDATE ... WHERE ... RETURNING` claims (paid transition, email
claims, `boosterEarning`) and the cleanup `WHERE` clauses. A chain mock would test the mock.
PGlite gives real Postgres semantics with zero network and zero VM load, at the cost of one
dev dependency.

```bash
npm i -D @electric-sql/pglite drizzle-kit   # drizzle-orm/pglite ships with drizzle-orm
```

---

## 7. Non-blocking findings (fix after the merge)

Three more issues the agents found while reading. None blocks the merge; all should be closed
before the repository goes public.

| Priority | Location | Problem | Consequence |
| --- | --- | --- | --- |
| **P1** | `app/api/auth/register/route.ts` | A wrong OTP neither deletes the code nor counts the attempt. The only limit is the route's 8/min tier. | A 6-digit code allows ~11 000 guesses per day from one IP. Fix: delete the OTP after N failures, or store an attempt counter. |
| **P2** | `app/api/auth/send-otp/route.ts` | The "email already registered" check compares the **raw** email while the rate-limit key lowercases it. | `User@x.ru` slips past the 409 and fails later on the unique constraint as a 500/409 from `register`. |
| **P2** | `app/api/payment/freekassa/notify/route.ts` | When Freekassa omits `intid`, the paid order is stored with `paymentId = NULL`. | That row matches the cleanup job's hard-delete predicate (if an admin later cancels it) and can be re-opened by a stale retry. Fix: write a sentinel instead of NULL. |
| **P2** | `app/api/payment/freekassa/notify/route.ts` | The `GET` handler calls `req.formData()` unconditionally; undici throws on a bodyless GET, so a GET connectivity probe 500s and the `searchParams` merge never runs on GET. | Harmless today (a 500 still proves reachability, and FK sends real notifications by POST), but the documented "GET query-string params" support does not work. Pinned by a test. Fix: skip `formData()` when there's no body / on GET. |

Also noted, cosmetic: the md5 signature comparison in `lib/freekassa.ts` uses `===` on strings
rather than `timingSafeEqual`. Low impact (it compares hashes, not the secret) but cheap.

---

## 8. Execution order for the next session

```
[x]  1. lib/freekassa.ts — delete the three secret-logging lines          §3.1  (commit 2f844a4)
[x]  2. Rotate FREEKASSA_SECRET_2 (dashboard + prod .env), pm2 flush      §3.1  (VM, 2026-08-02)
[x]  3. notify/route.ts — trim header/payload logging to one line         §3.2  (commit 2f844a4)
[x]  4. vitest.config.mts env block + lib/__tests__/dbGuard.test.ts       §3.3
[x]  5. .gitignore + git rm the dead scripts                              §3.4  (2026-08-02; misc/migrations.sql was a STALE bootstrap DDL contradicting lib/schema.ts — deleted, git history keeps it; dangling pointer in docs/WEBHOOK_ANALYSIS.md fixed)
[ ]  6. tsc --noEmit && npm test && npm run build                         §3.5  (tsc+test green ×3; `npm run build` needs the DB tunnel — owner runs it)
[ ]  7. Merge rebranding-v2 → main, push (this is a production release)   §3.5  (push of deploy.yml needs a workflow-scope token or SSH auth)
[x]  8. deploy.yml — add the blocking `npm test` step                     §4    (2026-08-02; between Typecheck and Lint, no continue-on-error; suite needs no DB/secrets. vitest testTimeout/hookTimeout raised to 30 s so PGlite cold boot can never flake the deploy gate)
[x]  9. Install PGlite, build test/utils/{pgliteDb,dbStub}.ts             TEST_PLAN §1
[x] 10. Tranche A — money                                                 TEST_PLAN §2
[x] 11. Tranche B — quest-gate                                            TEST_PLAN §3
[x] 12. Tranche C — auth & security                                       TEST_PLAN §4
[ ] 13. Fix the three non-blocking findings                               §7
[ ] 14. Public-repo checklist + README                                    §5
```

Steps 1–7 are one sitting. Steps 10–12 are independent of each other and can be done in any
order or across several sessions.

### Progress log — tranches A, B, C written (2026-08-01)

Steps 4, 9, 10, 11, 12 are **done**. `npm test` is green: **271 tests, 37 files, ~10 s**,
zero network, zero VM, `tsc --noEmit` clean. Stable across repeated runs.

- **Infrastructure:** installed `@electric-sql/pglite`; added `test/utils/pgliteDb.ts`
  (real Postgres in memory — schema pushed **once per file**, tables `TRUNCATE`d between
  tests, which is both isolated and fast) and `test/utils/dbStub.ts` (chainable recording
  stub). `vitest.config.mts` now poisons `DATABASE_URL` to a blocked sentinel and
  `lib/__tests__/dbGuard.test.ts` pins it; `vitest.setup.ts` guards its `window` patches so
  node-environment suites don't throw.
- **214 new tests** across the three tranches (A ≈ 96, B ≈ 46, C ≈ 72), each anchored to a
  documented invariant or a real incident, per the specs in `docs/testing/TEST_PLAN.md`.
- **Finding surfaced while testing (added to §7 below):** the Freekassa notify handler calls
  `req.formData()` unconditionally, and undici throws on a **bodyless GET**, so the
  documented "GET query-string params" probe path 500s and its `searchParams` merge is dead
  code on GET. Harmless operationally (a 500 still proves reachability) but pinned by a test
  so it isn't mistaken for working. The query-string merge **is** exercised and verified on
  the POST path.

**Still open from this file:** steps 1–3 (the secret-log removal + `FREEKASSA_SECRET_2`
rotation — deliberately left for the owner because it needs the dashboard + prod `.env`),
5–8 (repo cleanup, verify, merge, CI `npm test` step), 13–14. The C5 `callback_query`
handler in `lib/telegramClient.ts` (buttons-disabled reply) is the one sub-item from the
plan not yet covered; the webhook-auth half of C5 is done.
