# Interview note

## 1. PAYMENT FLOW (whaleabyss)

`/api/checkout` -> order `pending` -> Freekassa -> `/api/payment/freekassa/notify` -> `paid`

- Browser sends **slugs + quantity only. NO prices.** Server reads real price from DB.
  -> "never trust the client" (else 2000 RUB service bought for 1 RUB)
- `priceAtPurchase` = price snapshot -> old orders keep real price
- Gates: rate limit 10/min | Adventure Rank 422 | quest declaration 409
- Webhook proof = **shared secret**: `md5(shop_id:amount:SECRET_2:order_id)` = SIGN
  Fake sender knows all except SECRET_2 -> can't fake SIGN
- Also compare amount vs `totalPrice` -> mismatch = 400, do nothing, make noise
- Must answer text **`YES`** (request/response, same call). Else FK **retries 24h**
- **Idempotent**: only work if `pending`, or `cancelled` + no `paymentId`.
  Else answer YES, do nothing. (10 runs = same as 1 run)
- `paymentId` 2 jobs: stops double processing + real cancel vs abandoned
- Cron cancels `pending` after 1h. Slow payer -> late webhook re-opens it
- Telegram/email/cart = **best effort** try/catch. Order already paid;
  failing would make FK retry the money code because a chat message failed
- **Known race condition**: read (:109) -> decide (:142) -> write (:159) = gap.
  2 retries overlap -> both read `pending` -> 2 Telegrams, 2 emails.
  Fix: `UPDATE ... WHERE id=$1 AND status='pending'` + check rows changed
  (1 = I'm first, do work / 0 = someone beat me, just YES).
  Low risk, never happened, but not fixed yet.

> "Read then write is 2 steps. 2 steps have a gap."

## 2. AI STORY - quest addon bug (6 beats)

1. **12 July** - customer paid 2000 RUB for service needing quests, order arrived
   with **no declaration** -> booster didn't know what customer wanted
2. **First fix**: retry the fetch 3x + warning in Telegram. **Wrong code path.**
3. **25 July** - happened again. Order `96162b2e`, 2000 RUB. **It didn't hold.**
4. **Went to the data**: 27 gated order lines, exactly 2 broken. 0 bad carts.
   No deploy nearby. -> proved the retry fix aimed at the wrong thing
5. **Root cause**: parent item stored **`undefined`**. Choice existed only as
   separate cart lines. Delete them (trash, or minus at qty 1) -> silently lost
6. **Real fix + proof**: explicit `'quests'` value + server re-reads links and
   **returns 409**; cart page catches it and **re-opens the modal** (nothing lost).
   **Replayed 50 real paid orders: blocked exactly the 2 bad, passed 48.**

> "A client-side check is a nice UX, not a guarantee. If it matters for money,
> the rule lives on the server." + "A fix isn't a fix until data says so."

## 3. AI WORKFLOW

**Setup - 3 layers**
- global `CLAUDE.md`: compact CLI tools (fewer tokens), commit rules, quality > speed
- project `CLAUDE.md`: stack, DB rules, deploy, **written post-mortems of every bug**
  -> "onboarding docs for the AI. Next session already knows why the code is like this"
- skills: `no-mistakes` (gate: review+test+lint), `lavish` (visual plan review), `learn`

**Prompting**
- investigate + tell me the cause BEFORE writing code
- bug fix starts by **reproducing E2E**, like a real user
- review the plan visually, not the code afterwards

**Model / tokens**
- big model = architecture, planning, hard debugging | cheap = mechanical edits
- biggest saving = tooling that returns a small table, not a page of JSON
- small focused context; standing knowledge in CLAUDE.md, not re-typed

**Verification - 4 levels (weak -> strong)**
1. gate: no-mistakes skill + CI typecheck hard-blocks deploy
2. real browser, real clicks, read the console; picky about UI
3. **production data**: replayed 50 real orders (tests only cover what I thought of)
4. **broke it on purpose**: made the build fail to prove the site kept serving

**"Do you understand AI's code?"**
- not every line. I don't ship what I can't explain on paths that matter.
- built a **spaced-repetition tracker** in the repo: what I learned, when I last
  proved it, where I was wrong. Every session opens with a 2-min quiz.
  "I built it because I was accepting code faster than I was understanding it."

**Weekly demo idea** = that tracker. "It turned using AI into learning from AI."

## 4. IF ASKED ABOUT DEPLOY (short, then stop)

Auto-deploys from `main` via GitHub Actions. Typecheck gate blocks it. Builds on
the VM, swaps the new build in. July outage: failed build took the site down, so
now it builds into a separate folder and rolls back if the health check fails.
"I know that pipeline less well than the payment path - I'd read it before changing it."

## 5. WHEN YOU DON'T KNOW

> "Not cold. Here's how I'd approach it: ... and here's how I'd verify it works."

Never bluff. A confident wrong answer is the only unrecoverable one.

## 6. WORDS

modal (MOH-dl, not model) | declaration / to declare | root cause vs symptom |
code path | to ship | **it didn't hold** | to trace | **silently** | to fall back |
backstop | to reject | **to replay** | to reproduce | edge case | **idempotent** |
race condition | atomic | roll back | no-op | outage | best effort | gate

**Phrases**: "we shipped a fix, and it didn't hold" / "instead of guessing, I went
to the data" / "it changed nothing, it was the wrong code path" / "silently lost -
no error, no log" / "I replayed 50 real orders" / "I broke it on purpose"

Short sentences. Full stop instead of "and". Don't try to sound clever.
