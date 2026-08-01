# Audit findings — security, secrets, repo hygiene

Companion to [`TEST_BEFORE_MERGE.md`](../../TEST_BEFORE_MERGE.md) and
[`TEST_PLAN.md`](./TEST_PLAN.md). Produced 2026-08-01 by a six-agent parallel read of the
whole codebase ahead of merging `rebranding-v2` into `main`.

**Method:** six subagents, one per area, each reading its files end to end and reporting
structured findings (`flow`, `why_special`, `current_coverage`, `tests[]`, `priority`) plus a
secrets/PII scan. ~545k tokens of subagent work, 6/6 completed, 0 errors.

| Agent | Area | Flows reported |
| --- | --- | --- |
| 1 | Payments & money | 8 |
| 2 | Cart, quest addons, order events | 9 |
| 3 | Auth & security | 9 |
| 4 | Admin & portal | 9 |
| 5 | Frontend components & client logic | 10 |
| 6 | Test infrastructure, CI, repo hygiene | 5 |

---

## 1. Security findings

### 1.1 🔴 P0 — `FREEKASSA_SECRET_2` written to production logs on every webhook

**`lib/freekassa.ts:357-359`**

```ts
console.log('[Freekassa] Signature string:', signatureString);   // contains SECRET_2 in plaintext
console.log('[Freekassa] SECRET_2 length:', secret2.length);
console.log('[Freekassa] SECRET_2 first 4 chars:', secret2.substring(0, 4));
```

`signatureString` is `` `${shopId}:${amount}:${secret2}:${orderId}` `` — the secret is embedded
verbatim. This executes on **every** payment notification, so the secret sits in pm2 logs on the
production VM, and has for as long as these lines existed.

**Impact:** anyone with log access (or any future log-shipping integration) can mint a valid
`SIGN` for a forged "order paid" webhook and receive services without paying. This is the only
real authentication on the money-moving endpoint.

**Fix:** delete the three lines. Lines 366–368 (`Expected signature` / `Received signature` /
`Match`) may stay — those are md5 hashes. **Then rotate the secret** in the Freekassa dashboard
and the prod `.env`, and truncate existing logs (`pm2 flush`). Removing the log line does not
un-leak what is already on disk.

### 1.2 🔴 P0 — Customer PII written to production logs

**`app/api/payment/freekassa/notify/route.ts:44-79`**

Logs the complete request header set and the entire parsed notification payload, which contains
`P_EMAIL` and `P_PHONE`. Not a tracked-file secret, but personal data accumulating in logs
indefinitely. Trim to the order id and amount.

### 1.3 🔴 P0 — Nothing stops a test from reaching the production database

Not a code defect, an **infrastructure hazard** that becomes live the moment anyone follows the
test plan. On the development machine `DATABASE_URL` points at the **production** database
through an SSH tunnel, and `lib/db.ts` creates a `pg.Pool` at module scope. The current tests
happen not to import `lib/db` — by convention only. The first test written for
`lib/orderCleanup.ts` (which issues `DELETE`s) would run against production.

**Fix:** poison `DATABASE_URL` inside the vitest environment plus a canary test — see
`TEST_BEFORE_MERGE.md` §3.3. The `vi.mock('@/lib/db')` seam in every test is the primary
protection; this is the backstop for when someone forgets it.

### 1.4 🟡 P1 — OTP brute force during registration

**`app/api/auth/register/route.ts`**

The OTP is looked up by email and compared with plain string inequality. Expiry is checked
**after** the code match, and the `otps` row is deleted **only on success** — so a wrong guess
does not invalidate the code. The only limit is the route's `auth` tier (8/min per IP), which
allows roughly **11 000 guesses per day** from one IP against a 6-digit code.

**Fix:** delete the OTP row after N failed attempts, or add an attempt counter to the row.

### 1.5 🟢 P2 — Case-variant emails slip the duplicate check

**`app/api/auth/send-otp/route.ts`**

The "email already registered" check compares the **raw** email while the rate-limit key
lowercases it. `User@x.ru` passes the 409 check when `user@x.ru` exists, and fails later on the
unique constraint, surfacing as a 500/409 from `register`. Normalise the DB lookup.

### 1.6 🟢 P2 — `paymentId` NULL on a paid order

**`app/api/payment/freekassa/notify/route.ts`**

When Freekassa omits `intid`, the order transitions to `paid` with `paymentId = NULL`. That row
then matches the cleanup job's hard-delete predicate (if an admin later cancels it) and can be
re-opened by a stale retry. `'TEST'` and `'MANUAL'` exist precisely as non-null sentinels for
this reason; a third sentinel is needed here.

### 1.7 🟢 Cosmetic — non-constant-time signature comparison

`lib/freekassa.ts` compares the md5 signature with `===` rather than `timingSafeEqual`. Low
impact (it compares hashes, not the secret) but cheap to fix. Note the contrast with
`/api/telegram/webhook`, which does it correctly — including the length-equality guard that
`timingSafeEqual` requires (it **throws** on unequal-length buffers).

---

## 2. Secrets and PII scan

All 456 tracked files were scanned for connection strings, tokens, keys, and personal data.

| Check | Result |
| --- | --- |
| Hard-coded credentials | **None.** Every script reads `process.env` — verified across `scripts/test/*`, `scripts/telegram/set_telegram_webhook.mjs`, `scripts/db/*`, `scripts/seed/*`. |
| Connection strings / tokens / keys | **None.** Pattern matching across the tree hit only placeholder text (`docs/FREEKASSA_DEBUG.md` → `your_secret_2`). |
| Telegram bot token, chat id | **Absent.** |
| `DATABASE_URL` value, S3 keys | **Absent.** |
| Customer PII | **None.** The only email addresses in docs, scripts and fixtures are `admin@test.com` and `test@example.com`. |
| `agreement.html` | Blank template — ФИО/ИНН fields are underscores. |
| `migrations.sql` | DDL only, no `INSERT`s. |
| Test fixtures | Invented data throughout. |

**Verdict: the repository contains no secrets and no customer data.** The publication risk is
reconnaissance, not credentials — see §4.

---

## 3. Repo hygiene inventory

### Keep — these are the portfolio

| Path | Note |
| --- | --- |
| `components/__tests__/`, `store/__tests__/` | 5 files, 57 tests. Regression-anchored to real production incidents. The best evidence of engineering quality in the repository. |
| `vitest.config.mts`, `vitest.setup.ts` | Careful setup: polyfills for HeroUI/vaul/Radix, `@vitejs/plugin-react` deliberately skipped (Babel 8 peer conflict), `globals: false`. |
| `scripts/test/preview_emails.ts` | Renders every email template for review; optional real send behind `SEND=1`. No secrets. |
| `scripts/test/test_email_claim.ts` | Documents the exactly-once claim with a concurrent-call E2E. |
| `scripts/test/cleanup_test_orders.mjs`, `create_dummy_orders.ts` | Operational tools, still used. |
| `cleanup_stale_orders.mjs` | Referenced by the cron setup in `CLAUDE.md`. |

### Fix

| Path | Action | Why |
| --- | --- | --- |
| `.email-previews/` | Add to `.gitignore` | Not currently ignored, and `preview_emails.ts` writes rendered order emails there by default. Run it against a real order and one `git add .` commits a customer's name and order contents. |

### Delete

| Path | Why |
| --- | --- |
| `scripts/test/test_pay.js` | One-off that writes to the production database from a dev machine. |
| `scripts/test/test_db.mjs` | Same. |
| `scripts/test/test-webhook.mjs`, `test_webhook_update.mjs` | Superseded by the planned webhook tests; both are ad-hoc prod pokers. |
| `scripts/test/test_email.mjs`, `test_freekassa_signature.mjs` | Superseded by `preview_emails.ts` and the planned unit tests. |
| `seed_quest_services.mjs`, `seed_service_addons.mjs` (root) | `DB_RULES.md` says migration scripts are deleted after being applied. The repo should follow its own rule. |
| `misc/` | Scratch output: `background.html`, `design.json`, `remove_test.sql`, `services_output.json`, `tmp_circle.png`. |

Git history retains all of them; this is a working-tree tidy, not a data loss.

### Also worth noting

- `/public` is in `.gitignore` but partially tracked — documented as intentional (assets are
  managed separately), so leave it.
- `docs/` holds several point-in-time investigation notes (`DIAGNOSTICS_REPORT.md`,
  `PAYMENT_STATUS_FIX.md`, `WEBHOOK_ANALYSIS.md`, `ACCOUNT_MANAGEMENT_DATES_FIX.md`). Harmless,
  and arguably good — they show a debugging process. `FREEKASSA_DEBUG.md` contains only
  placeholders.

---

## 4. Public-repository checklist

The decision (2026-08-01) is to make **this** repository public rather than create a separate
fork. Nothing below is a credential; all of it is operational reconnaissance or an outdated
claim.

| # | Item | Contents | Action |
| --- | --- | --- | --- |
| 1 | `CLAUDE.md`, `.github/workflows/deploy.yml` | Production static IP `93.77.188.163`, SSH username `qantr`, VM sizing, the DB tunnel command, full disaster-recovery runbooks | Move the infrastructure sections to a private note. Keep the architecture sections — they are the interesting part. |
| 2 | `CLAUDE.md` | A candid list of unfixed weaknesses: CSP is report-only, `X-Forwarded-For` makes IP rate-limit buckets spoofable, the limiter is single-process only | Remove, or fix the weaknesses first. |
| 3 | `INTERVIEW_NOTE.md` | Documents an unfixed race condition in the payment webhook with file:line pointers — **that race is already fixed in this branch** | Delete or rewrite; the file is stale. |
| 4 | `.claude/learn/*.jsonl` | The owner's personal learning and mistake log | `.gitignore` + `git rm --cached`. |

### ⚠️ Git history is not cleaned by editing the working tree

The prod IP, the SSH username and `INTERVIEW_NOTE.md` remain readable in every historical
commit. Two options:

1. **Accept it.** The IP is already public — `whaleabyss.ru` resolves to it. What actually
   protects the VM is SSH key-only authentication and nginx, not the secrecy of an address.
   Username plus public IP is marginal help to a password-spray attacker **provided password
   auth is off**. → **Verify `PasswordAuthentication no` in `/etc/ssh/sshd_config` before
   publishing.** That single check neutralises most of this item.
2. **Rewrite history** with `git filter-repo`. Invasive, breaks every existing clone, and
   disrupts the deploy pipeline's assumptions.

**Recommendation:** option 1 — verify key-only SSH, clean the working tree, accept the history.

### Add a README before publishing

The repository's genuinely strong parts are invisible without one. Worth leading with:

- **Server-side price recomputation** at checkout — the client's `total` is ignored entirely.
- **One exactly-once pattern applied uniformly** — conditional `UPDATE ... WHERE flag IS NULL
  RETURNING` used as an atomic claim for order emails, celebration modals, booster commission,
  and the `pending → paid` webhook transition.
- **The quest-gate server backstop**, written after two real revenue incidents, with the design
  rule stated plainly: a client-side gate is a UX affordance, not a guarantee.
- **The optimistic-status registry** — a 15-minute sessionStorage TTL with a precedence ladder
  that self-corrects against real status.
- **The atomic webhook transition** — eligibility inside the `UPDATE`'s `WHERE`, so Freekassa's
  aggressive retries cannot double-fulfil.

Point at the tests as evidence for each. They are anchored to incidents, not to a coverage
percentage — which is also the better interview story.

---

## 5. CI recommendation

`npm test` exists in `package.json` and is invoked **nowhere**. A push to `main` auto-deploys to
production, and the `verify` job gates only on `tsc --noEmit` (lint is `continue-on-error` due to
~85 pre-existing errors).

```yaml
# .github/workflows/deploy.yml — job "verify", between Typecheck and Lint
- name: Unit tests
  run: npm test
```

Needs no database and no secrets; runs in ~2 s on top of an `npm ci` that is already paid for. A
failure skips the `deploy` job entirely, leaving production untouched.

**No coverage threshold**, deliberately — at this repository's size a percentage gate produces
tests written to satisfy the number rather than to pin behaviour.

> Pushing any change under `.github/workflows/` requires a token with the `workflow` scope, or
> SSH-based git auth. A plain PAT is rejected by GitHub.

---

## 6. Coverage map

Current state per area, from the agents' `current_coverage` fields.

| Area | Flows | Covered today |
| --- | --- | --- |
| Payments & money | 8 (6× P0) | **0** |
| Cart, quest addons, order events | 9 (5× P0) | Partial — `store/__tests__/useCart.test.ts` covers the pending-sync flag lifecycle and `decideCartStartup`; the merge union, revision guard and sync serialisation are untested |
| Auth & security | 9 (5× P0) | **0** |
| Admin & portal | 9 (6× P0) | **0** |
| Frontend & client logic | 10 (5× P0) | Partial — `OrderCard.test.tsx` covers the badge and expand behaviour only, not status resolution |
| Test infra & CI | 5 | The 57 existing tests are good; the gaps are the DB guard and the CI wiring |

**Total P0 flows with zero coverage: 27.** Tranches A, B and C (selected) address 19 of them;
the remaining 8 sit in tranches D, E and F.

---

## 7. Raw agent output

The full structured results are retained at:

```
~/.claude/projects/-home-wopler-dev-whaleabyss/542bd16f-6061-4f46-b2ab-e06618cbe5f4/
  subagents/workflows/wf_68ffde0a-b99/journal.jsonl
```

Per-agent transcripts sit alongside as `agent-*.jsonl`. Everything material from them has been
transcribed into these three documents; the raw files are session-scoped and will eventually be
cleaned up.
