# Test plan — tranches A, B, C

Companion to [`TEST_BEFORE_MERGE.md`](../../TEST_BEFORE_MERGE.md). Written 2026-08-01 from a
six-agent code audit. Nothing here is implemented yet.

**Scope:** tranches **A** (money), **B** (quest-gate), **C** (auth & security) were selected.
Tranches D, E, F are recorded as backlog in §5 so the analysis is not lost.

**Non-negotiable rule:** no test may reach the network, the production database, SMTP,
Freekassa, Telegram, or the VM. On this machine `DATABASE_URL` points at the **production**
database through an SSH tunnel. See §1.

---

## 1. Infrastructure to build first

### 1.1 Environment poisoning (do this before writing any test)

Covered in `TEST_BEFORE_MERGE.md` §3.3 — `vitest.config.mts` sets `DATABASE_URL` to
`postgres://vitest:vitest@127.0.0.1:1/blocked` (port 1 refuses instantly), plus a canary test.
This is defence in depth behind the mocks, not a replacement for them.

### 1.2 `test/utils/pgliteDb.ts` — real Postgres, in memory

The single most important seam. Used by every test in tranche A and the server half of B.

```ts
// test/utils/pgliteDb.ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import * as schema from '@/lib/schema';

export async function makeTestDb() {
  const client = new PGlite();                 // in-process, no socket, no file
  const db = drizzle(client, { schema });
  const { apply } = await pushSchema(schema, db as never);
  await apply();                               // creates the real tables from lib/schema.ts
  return { db, client };
}
```

Used as:

```ts
vi.mock('@/lib/db', () => ({ db: testDb }));   // hoisted — lib/db.ts never executes
```

**Why PGlite rather than a chainable drizzle stub:** the invariants under test in tranche A
*are* SQL predicates. `UPDATE orders SET status='paid' WHERE status='pending' RETURNING *`,
the email claims (`WHERE paid_email_sent_at IS NULL`), the `boosterEarning IS NULL` guard, and
the cleanup `WHERE` clauses are the whole design. A mock that returns canned rows would assert
the mock's behaviour, not Postgres's. PGlite runs real Postgres semantics with zero network.

### 1.3 `test/utils/dbStub.ts` — chainable stub for behaviour tests

Cheaper than PGlite where the question is "what did the code call", not "what did SQL do".
Used by most of tranche C. A thenable proxy whose builder methods return `this`, resolving
from a per-test FIFO queue, with recorded `insert`/`update` payloads and a
`transaction(cb)` that hands `cb` a recording tx.

### 1.4 `test/utils/sqlCapture.ts` — SQL shape without a database

`drizzle-orm/pg-proxy` with a callback that records `{ sql, params }` and returns queued rows.
No engine at all. Used for "does this query still contain the `notTestOrder` filter" style
assertions (tranche E backlog).

### 1.5 Conventions

- **Every** `lib/` and API-route test file starts with `// @vitest-environment node` — the
  config default is jsdom and route handlers do not want a DOM.
- Colocated `__tests__/` directories. The existing glob `**/__tests__/**/*.test.{ts,tsx}`
  already matches `lib/__tests__/` and `app/api/**/__tests__/`.
- `vitest.setup.ts`'s `window` patches must be wrapped in a `typeof window !== 'undefined'`
  guard once node-environment files exist.
- Route handlers are plain exported async functions: `POST(new NextRequest(url, {...}))`,
  with `{ params: Promise.resolve({ id }) }` as the second argument where applicable.
- **Always** `vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))` —
  importing the real module pulls in the whole NextAuth graph (DB, env, bcrypt).
- **Always** `vi.mock('@/lib/email')` in route suites — the real module constructs the
  nodemailer SMTP transporter at import time. `vi.mock` intercepts dynamic `import()` too, so
  routes that lazily import it are still covered.
- `lib/rateLimit.ts` holds module-level state (a `Map` plus an unref'd `setInterval`).
  Isolate with `vi.resetModules()` + dynamic import per test, and
  `vi.useFakeTimers({ shouldAdvanceTime: false })` + `setSystemTime` for window maths. Never
  share one imported instance across window tests.

### 1.6 New dev dependencies

```bash
npm i -D @electric-sql/pglite drizzle-kit
```

`drizzle-orm/pglite` ships inside `drizzle-orm`, already installed.

---

## 2. Tranche A — money (~45 tests, ~6 h)

Zero coverage today. Every flow below moves real money or determines whether an order can be
paid at all.

### A1. Checkout: server-side price recomputation — P0

`app/api/checkout/route.ts`

**Why it is special:** the client's `total` and `item.price` are deliberately ignored; totals
come from current `services.price`. Duplicated slugs are summed into one line. Test services
and unknown slugs must 400. A guest with a promocode silently gets no discount. The amount
sent to Freekassa must equal the stored `totalPrice`, or every later webhook fails the amount
check and the customer pays for nothing.

**Harness:** `// @vitest-environment node`; `vi.mock('@/lib/db')` → PGlite; `authOptions` stub;
`vi.mock('next-auth/next')` for `getServerSession`; `vi.mock('@/lib/freekassa', importOriginal)`
replacing only `createFreekassaOrder` with
`vi.fn().mockResolvedValue({ location: 'https://pay/x', fkOrderId: 1 })`;
`vi.mock('@/lib/apiRateLimit')` → `enforceRateLimit` returns `null`.

**Cases**

1. Seed services at `'1000.00'` and `'500.50'`. POST with tampered `item.price = 1` and
   `total = 1` → `orders.totalPrice === '2501.00'` in PGlite, `createFreekassaOrder` called
   with amount `2501`, and each `order_items.priceAtPurchase` equals the DB price.
2. `items: [{id:'x',quantity:1},{id:'x',quantity:2}]` → exactly one `order_items` row,
   `quantity` 3.
3. Reject table, each asserting **no** order row was inserted: unknown slug → 400;
   `isTestService: true` slug → 400; quantity `0` / `-1` / `'abc'` → 400; missing email → 400;
   adventureRank `0` / `61` / `NaN` → 400; method `999` → 400.
4. Promocode maths: seed a 10% code, logged-in session → `totalPrice` is `round2(subtotal*0.9)`
   with a subtotal chosen to exercise rounding (`1234.50` → `'1111.05'`). Invalid / expired /
   already-used → 400 with the helper's message and no order. **Guest** + valid code → order at
   **full** price with `orders.promocode` NULL (documented silent no-discount).
5. `createFreekassaOrder` rejects → response 500 **and a pending order row still exists**. Pin
   this: it is the abandoned-order path the cleanup job later cancels, and deleting the row
   instead would break late-payment reopen.

### A2. Freekassa webhook: signature and amount — P0

`lib/freekassa.ts`, `app/api/payment/freekassa/notify/route.ts`

**Why it is special:** the md5 `SIGN` is the **only** real auth on the money-moving endpoint
(the IP check is opt-in). The comparison is case-insensitive by design; `merchantId` must match
the env `shopId`; the amount check uses `parseFloat`, so `'1500'` vs `'1500.00'` must pass. A
forged-but-accepted webhook means free orders; a false reject means Freekassa retries for 24 h
and then the customer has paid and received nothing.

**Cases — `verifyFreekassaNotification` (unit, `vi.stubEnv` only):**

1. Compute the expected md5 **in the test** with `node:crypto` over
   `` `${shopId}:${amount}:${secret2}:${orderId}` `` → exact match passes.
2. Uppercase hex signature passes (case-insensitive compare).
3. Wrong `merchantId` → false. Amount altered by `0.01` → false. Signature built with
   `SECRET_1` instead of `SECRET_2` → false.
4. Pin that `getEnv` throws when any of the four `FREEKASSA_*` vars is missing — including
   `API_KEY`, which this function does not use.

**Cases — `buildFreekassaPaymentUrl` / `signApiRequest`:**

5. Parse the returned URL: `s === md5(`${shopId}:${amount}:${secret1}:RUB:${orderId}`)`;
   whole rubles format as `'1500'` not `'1500.00'` (pins the `Number(toFixed)` behaviour the
   webhook's `parseFloat` tolerates); custom param key validation throws on `'foo'` and
   `'us_ dash'`.
6. `createFreekassaOrder` with `vi.stubGlobal('fetch')`: signature is HMAC-SHA256 over
   alphabetically-sorted values joined by `|`; non-JSON responses and `type !== 'success'`
   **throw** rather than returning a bogus `location`.

**Cases — notify handler rejects (integration, PGlite + mocked telegram/emails):**

7. Valid fields, garbage `SIGN` → 400, order still `pending`.
8. Correctly signed but `AMOUNT != totalPrice` → 400, order still `pending`. (An attacker who
   knows the secret still cannot underpay.)
9. `AMOUNT '1500'` vs `totalPrice '1500.00'` → processed.
10. Missing `SIGN` → 400. Unknown `MERCHANT_ORDER_ID` → 404. Params in the query string via
    GET (the Freekassa probe path) → same verification runs.
11. `FREEKASSA_CHECK_IP=true`: `x-forwarded-for: '1.2.3.4'` → 403 before any parsing; an
    allow-listed IP → proceeds; `'spoofed, 168.119.157.136'` (allow-listed entry not leftmost)
    → 403, pinning that the leftmost entry is what is trusted.

### A3. Webhook atomic claim, duplicate delivery, late reopen — P0

`app/api/payment/freekassa/notify/route.ts`

**Why it is special:** eligibility lives **inside** the `UPDATE`'s `WHERE`
(`pending` OR `cancelled && paymentId IS NULL`) because Freekassa retries aggressively and
double fulfilment (double email, double Telegram, double promocode usage) actually happened
before this design. The zero-rows loser must still answer `YES` (otherwise 24 h of retries) and
must not redo fulfilment. Late reopen after an auto-cancel is a real revenue path. **These are
SQL predicates — they need PGlite, not a chain mock.**

**Cases**

1. Happy path: valid signed POST → body is exactly `'YES'`; `status='paid'`,
   `paymentId = intid`, `updatedAt` bumped; `notifyAdminAboutOrder` called once;
   `claimAndSendPaidEmail` called once with `recipientHint = P_EMAIL`; the user's `cart_items`
   are deleted.
2. Duplicate delivery: fire the identical request twice. After the second — Telegram called
   **once**, `promocode_usage` still one row, response still `'YES'`, **but**
   `claimAndSendPaidEmail` called a second time (the deliberate retry-as-email-retry hook).
3. A `refunded` order + valid webhook → `'YES'` and `claimAndSendPaidEmail` **not** called
   (refunded is outside the paid-family retry list).
4. Late reopen: `status='cancelled'`, `paymentId` NULL (the cleanup-job shape) → flips to
   `paid` with **full** fulfilment.
5. `status='cancelled'`, `paymentId='12345'` (admin cancelled after payment) → `'YES'`, status
   stays `cancelled`, zero fulfilment calls.
6. **Regression pin:** payload without `intid` on a pending order → order becomes paid with
   `paymentId` NULL. Assert it and comment that this shape is hard-deletable by cleanup and
   re-openable by a stale retry — see `TEST_BEFORE_MERGE.md` §7.
7. Promocode usage recorded exactly once, only on the claiming delivery. Guest order
   (`userId` NULL) with a promocode → zero usage rows, no crash.

### A4. Exactly-once order emails — P1

`lib/orderEmails.ts`

**Why it is special:** claim-then-send via `UPDATE ... WHERE sent_at IS NULL RETURNING`. Three
deliberate asymmetries a naive tester would miss: a **failed** send **releases** the claim so
Freekassa's next retry re-sends; a **missing recipient keeps** the claim (a retry cannot do
better); the helpers **never throw** (an email must never fail the paid transition). Regression
means either a customer who paid and was never told, or a customer sent N copies.

**Harness:** PGlite + `vi.mock('@/lib/email')` — mandatory, the real module builds the SMTP
transport at import.

**Cases**

1. First call → `sendOrderPaidEmail` called once, `orders.paidEmailSentAt` set.
2. Second call → not sent again.
3. `sendOrderPaidEmail.mockRejectedValueOnce(...)` → afterwards `paidEmailSentAt` is back to
   NULL (released), and a subsequent call sends successfully.
4. Guest order with `userNotes` containing `Email: g@x.ru` → recipient parsed from notes.
   Guest with **no** Email line → no send **and the claim is kept**. Pin the asymmetry.
5. `recipientHint` wins over `users.receiptEmail`.
6. Payload check: `totalAmount = parseFloat(totalPrice)`, items joined from `order_items` +
   `services`.
7. Mirror 1–3 for `claimAndSendCompletedEmail`.
8. `Promise.all` of two `claimAndSendPaidEmail(orderId)` calls → send mock called exactly once.
   Also: when the wrapped `db.update` itself throws, neither call rejects (the "never fail an
   order transition" contract).

### A5. Booster commission: 40% pre-discount, idempotent — P0

`lib/boosterPayout.ts`

**Why it is special:** the base is `SUM(priceAtPurchase * quantity)`, **not** `totalPrice` — a
customer's promocode must never shrink the booster's cut — with a legacy fallback to
`totalPrice` when there are no line items. `boosterEarning` doubles as the exactly-once guard.
Called from two independent sites (admin PATCH and portal complete), so double-crediting is
live. `isTestPayment` orders must never move a real balance.

**Cases**

1. Booster at `commissionPercent 40`, `balance '100.00'`; completed order `totalPrice '1800.00'`
   (post-discount) with items `2 × '1000.00'` → earning `'800.00'` (40% of the **2000**
   pre-discount sum), balance `'900.00'`, `orders.boosterEarning '800.00'`. Second call →
   balance unchanged.
2. A row with `quantity` NULL coalesces to 1 in the SQL subquery.
3. No-op matrix, each asserting balance and `boosterEarning` untouched: status `paid` /
   `in_progress`; `boosterId` NULL; `boosterEarning` already set (`'0.00'` counts as set);
   `isTestPayment = true`; legacy order with **zero** `order_items` → falls back to 40% of
   `totalPrice`; `boosterId` pointing at a deleted booster (leftJoin → `commissionPercent`
   NULL) → pins the current `'0.00'` behaviour.
4. `Promise.all([credit(id), credit(id)])` → balance incremented exactly once. Needs the real
   SQL engine; a drizzle mock passes vacuously.

### A6. Order lifecycle cleanup vs the 24 h retry window — P1

`lib/orderCleanup.ts`, `cleanup_stale_orders.mjs`

**Why it is special:** two predicates interlock with the webhook's late reopen. Cancelling sets
`updatedAt = now`, and deletion requires `updatedAt` older than one day — **that gap is
Freekassa's retry window**. Deleting too early destroys a slow-paying customer's order (money
taken, no record). `paymentId = 'TEST' / 'MANUAL'` are non-null sentinels precisely so cleanup
can never touch them.

**Cases**

1. Insert rows with explicit `createdAt`/`updatedAt` (no fake timers needed). Matrix: pending
   61 min → cancelled; pending 59 min → untouched; cancelled + `paymentId` NULL + 25 h →
   deleted with `order_items` cascade; same at 23 h → kept; cancelled + `paymentId '12345'` →
   **never** deleted; `'TEST'` and `'MANUAL'` → never deleted; `paid` / `completed` at any age
   → untouched by both functions.
2. `runOrderCleanup()` sequencing: a pending order 2 h old gets cancelled but **not** deleted in
   the same run (its `updatedAt` was just refreshed). This single test encodes the whole 24 h
   buffer design — if someone switches the delete predicate to `createdAt`, it fails loudly.
3. **Contract test:** `cleanup_stale_orders.mjs` duplicates the drizzle predicates in raw SQL
   and will drift. Run the script's two SQL strings against the same PGlite seed and assert
   identical surviving row ids. (Extract the SQL into an importable constant if regexing the
   file feels too clever.)

### A7. Promocodes: validation and burn-at-payment — P1

`lib/promocodeValidation.ts`, `app/api/promocode/validate/route.ts`

**Why it is special:** usage is inserted by the **webhook**, after the money moved — not at
checkout. So a code stays valid while an order sits pending, and abandoning a checkout must not
burn it. One helper spans the validate route, checkout, and admin manual orders.

**Cases**

1. `validatePromocodeForUser`: unknown → `{ok:false,'Промокод не найден'}`; `expiresAt` 1 s in
   the past → `'Промокод истёк'`; an existing `promocode_usage` row for (promo, user) →
   `'Клиент уже использовал'`; **another** user's usage does not block; `'  welc10 '` normalises
   to `'WELC10'`; success returns `{code, discountPercent, promocodeId}` verbatim.
2. The four-step economic contract, combining the checkout and notify harnesses on one PGlite
   instance: (a) checkout with the code → pending order, **zero** usage rows; (b) the same user
   checks out again with the same code → still accepted; (c) a signed webhook pays order #1 →
   **one** usage row; (d) a third checkout with the code → 400 «уже использовал».
3. Route: unauthenticated → 401; non-string code → 400; unknown → **404** (note: the route
   returns 404 where the shared helper's other consumers return 400 — pin the difference so a
   helper refactor does not silently change the client contract); expired/used → 400; success →
   `{success:true, code, discountPercent}`.

### A8. Email templates — P2

`lib/emailTemplates.ts`

Pure string builders, and the only escaping layer between DB content (service titles) and a
customer's inbox. The price column silently disappears unless **every** item carries a price.

**Cases:** title `<script>alert(1)</script>` appears only as `&lt;script&gt;`; price 1000 × qty
2 renders line total 2000 and the Итого row shows the passed total; one item with
`price: undefined` → **no** `₽` cells at all and no Итого row (the all-or-nothing rule);
quantity 1 renders no `x1` suffix; `orderId` is sliced to 8 uppercase chars in the subject
(assert via `sendOrderPaidEmail` with `sendEmail` mocked, capturing the subject). Use targeted
`toContain`, **not** snapshots — `toLocaleString('ru-RU')` embeds non-breaking spaces that churn.

---

## 3. Tranche B — quest-gate (~30 tests, ~4 h)

This encodes the incident that happened **twice**: paid orders `f216229e` (2026-07-12) and
`96162b2e` (2026-07-25), where a quest-gated service was bought with no declaration, so the
booster had no way to know what the client wanted.

### B1. `isQuestGatedAndUndeclared` — P0

`lib/addonChoice.ts`. Pure function, zero mocks. It is the single shared predicate behind the
`/api/checkout` 409 gate **and** the Telegram warning, precisely so the two cannot drift.

**Truth table**

| # | linked ids | choice | quest lines in order | expected |
| --- | --- | --- | --- | --- |
| 1 | undefined / `[]` | any | any | `false` |
| 2 | present | `'completed'` | none | `false` |
| 3 | present | `'self'` | none | `false` |
| 4 | present | `'quests'` | linked id present | `false` |
| 5 | present | `'quests'` | **none** | **`true`** ← the delete-the-quest-lines regression |
| 6 | present | null/undefined | linked id present | `false` ← legacy-cart tolerance |
| 7 | present | null/undefined | none | **`true`** |
| 8 | present | `'paid'` / `''` | none | **`true`** (garbage = undeclared) |

Plus `isAddonChoice` rejecting non-strings, `'COMPLETED'`, `''`, `null`, `'yes'` — it guards
what `/api/cart/sync` is allowed to store.

### B2. `/api/checkout` 409 gate, end to end — P0

Checkout harness from A1. Seed a parent service, a quest service, and a `service_addons` link
in PGlite.

1. Order the parent with no `addonChoice` → **409** `{code:'ADDON_CHOICE_REQUIRED', slugs:[parent]}`
   and **no** order row.
2. `addonChoice: 'self'` → 200, `order_items.addonChoice === 'self'`.
3. `addonChoice: 'quests'` **plus** the quest slug as a second item → 200.
4. `addonChoice: 'quests'` **without** the quest line → 409.
5. Flip the quest service to `isTestService = true` → the gate is skipped and the order is
   created. This is the unpurchasable-cart regression: hiding a quest service must not make its
   parent impossible to buy.
6. Tampered `addonChoice: 'hacked'` → dropped by the whitelist → treated as undeclared → 409.

### B3. `fetchQuestAddons` null-vs-array contract — P0

`lib/questAddons.ts`. `vi.useFakeTimers` + stubbed global fetch, `advanceTimersByTimeAsync` for
the backoff. **The null-vs-`[]` distinction is the whole post-incident design:** `null` means
"could not find out" → refuse the add; `[]` means a definitive "no quests" → plain add.

1. 200 `{addons:[...]}` → array on the first try, one fetch.
2. **404 → `[]` immediately, no retries** (definitive answer).
3. 503 twice then 200 → succeeds on attempt 3, after advancing 300 ms then 800 ms.
4. Three failures → **`null`**, exactly 3 fetches.
5. `AbortError` → retried, then `null`.
6. 200 with `{addons: 'garbage'}` → `[]`, not a crash.

### B4. `/api/services/[slug]/addons` response shape — P0

`// @vitest-environment node`, mocked db / session / rate limit. The incident's root cause was
this route answering both "no quests" and "lookup failed" with `200 {addons:[]}`.

1. Parent select resolves `[]` → **404**, body has `error`, and
   `expect(body).not.toHaveProperty('addons')`.
2. Parent found, the addon join throws → **503**, again **no** `addons` key. *This is the
   load-bearing assertion — comment it in the test.*
3. Success → addons mapped with `id = slug`, `price` parsed to a number, `subtitle` falling
   back to `title`, `image` `''` when null.
4. Optionally capture the drizzle condition objects to assert both queries include
   `isTestService = false`.

### B5. Add-to-cart gate — P0

`components/QuestAddonModal.tsx` → `useAddToCartWithAddons`. Render a tiny harness component
with a button wired to `add(item, 1, null, true)`; read outcomes from the **real** zustand
stores (`useCart`, `useAddonPrompt`, `useAddonError`) rather than rendering the modals.

1. Addons fetch resolves `null` (all 503, fake timers) → cart **unchanged**,
   `useAddonError.isOpen` true with a retry function that re-invokes `add`.
2. `addons = []` → item added directly, cart drawer opened.
3. Non-empty → `useAddonPrompt.open` called with mode `'add'`, cart still **empty**.
4. `hasQuestAddons = false` → **zero** fetches, direct add. (The server-rendered flag decides,
   never a fetch.)
5. Double-tap: click twice in the same tick while `/addons` is pending → exactly one fetch, one
   eventual add.

### B6. `QuestAddonModal` writes a positive declaration — P0

Seed `useAddonPrompt.open(parent, [questA, questB], 2)`, render the modal, mock `next/image`,
stub `POST /api/cart/sync` → 200.

1. Tick questA, click «Добавить с заданиями» → parent line has `addonChoice === 'quests'` **and**
   `quantity 2`, questA is a separate line, and it is **one** state update (`syncToDb` spy
   called once). *This is the fix for incident 2: `'quests'` used to be left undefined, so
   deleting the quest lines silently reverted the parent to indistinguishable NULL.*
2. «Задания уже выполнены» → parent with `'completed'`.
3. Mode `'declare'` with the parent already in the cart at qty 5 → choosing `'self'` sets
   `addonChoice` **without changing quantity 5**.
4. Declare mode with ticked quests → `declareAddon` appends the quest lines and sets `'quests'`.

### B7. `/cart` 409 recovery — P1

The UX half of the revenue gate. A regression turns the server's protection into a dead-end
«Ошибка при создании заказа».

Mock the shells (Header/Footer/Breadcrumb/AuthModal → null renderers), `next-auth/react`,
`next/navigation`. Seed one quest-gated line with `addonChoice` undefined. Route map:
`/api/user/profile` → a profile, `/api/cart/meta` → `{items:{},recommendations:[]}`,
`/api/checkout` → 409, `/api/services/slug-x/addons` → one quest.

1. Tick the privacy box, click «Перейти к оплате» → `useAddonPrompt` is open in mode
   `'declare'` for `slug-x` with `parentQuantity` equal to the line's quantity; **cart
   unchanged**; no error text.
2. `/addons` → 503 → the fallback error «Уточните, что делать с заданиями…» renders (never
   silently nothing).
3. `/api/checkout` → 422 with a plain-text body → the server's text shows verbatim (the
   Adventure Rank gate).
4. `requestDecrement` at quantity 1 → `confirmDialog` opens and the line survives until
   confirmed; on confirm it is removed and one sync POST fires. (That gesture produced
   incident 2.)

### B8. `POST /api/cart/sync` trust boundary — P1

`// @vitest-environment node`, chainable db stub with a recording `transaction(cb)`.

1. `addonChoice: 'quests'` passes through; `'evil'` or `42` is **absent** from the insert row
   (falls to the column default NULL) — a forged string must never reach a column the admin
   panel renders.
2. An item whose slug is not in the resolved map produces no insert row.
3. `items: []` → delete called, insert **not** called, 200. (That *is* the "cart emptied" write.)
4. No session → 401 and the db is never touched. Body `{items:'x'}` → 400.
5. All slugs resolved via **one** select call (spy on the count) — the latency property the
   sync-serialisation fix depends on.

---

## 4. Tranche C — auth & security (~40 tests, ~5 h)

Zero coverage today, so every test here is net-new protection. Mostly the chainable db stub
(§1.3); PGlite is not needed.

### C1. Credentials login: failed-attempts-only limiter, no enumeration — P0

`authorize()` from `authOptions.providers[0]` — in next-auth v4 the user config sits at
`(provider as any).options.authorize`, falling back to `.authorize`.

**Why it is special:** the limiter counts **only failures** and forgives the account key (not
the IP key) on success; the check runs **before** the DB query; a NULL `passwordHash`
(OAuth-only account) must fail with the byte-identical generic message as a missing account and
**consume a failure hit**; the email is lowercased and trimmed into the key; the literal
`'RATE_LIMITED'` string is a wire contract with `components/AuthModal.tsx`.

Mock `@/lib/db` (chainable) and `bcrypt` (so `compare` resolves instantly). Use the **real**
`lib/rateLimit` with `vi.resetModules()` + dynamic import per test and fake timers.

1. 8 failed attempts for one ip+email → the 9th throws `Error('RATE_LIMITED')` and
   `db.select` is **not** called.
2. 7 failures then a success → the next failure streak gets a fresh 8 (reset-on-success).
3. A user row with `passwordHash: null` and a correct-looking password → throws
   `'User not found'`, message **equal** to the missing-user case, and `bcrypt.compare` was
   never called.
4. 30 failures across 30 different emails from one IP → the 31st email throws `RATE_LIMITED`
   (IP spray cap, and proof that success-reset never touches the IP key).
5. Advance timers 15 min + 1 s → allowed again.
6. Mixed-case / whitespace email hits the same account key as the lowercase one.
7. Call `authorize` with the **plain header map** NextAuth actually passes
   (`{'x-forwarded-for': 'a, b'}` as a Record, not a `Headers`) and assert the limiter keys on
   `'a'`. That Record branch is the one production exercises and the one a "cleanup to
   Headers-only" would break.

### C2. JWT as a cache of the users row — P0

`authOptions.callbacks.jwt` / `.session`, called directly as plain async functions.

**Why it is special:** `role`/`username`/`avatar` are re-read from the DB on every request (only
when `user` is absent), and the client `update()` override is applied **after** the DB read so
it wins. Getting the ordering or the `if (user)` guard wrong either resurrects the 30-day stale
avatar bug or — worse — lets a **demoted admin keep `role:'admin'`** until the token expires.

1. Initial sign-in (`{token:{}, user:{...}}`) → token gets id/role/name/image and `db.select` is
   **not** called.
2. Refresh (`user: undefined`) with a DB row `{role:'user'}` on a token holding
   `role:'admin'` → token role becomes `'user'`. **The security-critical case.**
3. DB returns `[]` (deleted user) → the token keeps prior values. Pin the current behaviour;
   this is where it changes if deleted users should be signed out.
4. `trigger:'update'` with `session:{image:'new'}` while the DB row carries `image:'old'` →
   `token.image === 'new'` and `token.name` untouched, proving override-last and field scoping.
5. The session callback maps `token.{id,role,image,name}` onto `session.user` and defaults role
   to `'user'` when `token.role` is undefined.

### C3. `send-otp`: captcha before anything else — P0

**Why it is special:** the ordering *is* the design — captcha → rate check (5/email + 20/IP) →
record hits → DB checks → delete+insert OTP → send. If a refactor moves the rate check before
the captcha, bots burn a victim's 5-email budget with unsolved probes. If the send moves before
`recordRateLimitHit`, it is an email-bombing and SMTP-reputation incident.

1. Captcha false → 400, and `db.select`/`delete`/`insert` **and** `sendOtpEmail` all uncalled,
   **and** a follow-up captcha-true request still has the full 5-email budget.
2. Five captcha-true sends to one email → the 6th is 429 with a numeric `Retry-After`;
   `sendOtpEmail` called exactly 5 times.
3. Twenty sends from one IP across distinct emails → the 21st is 429.
4. The existing-email 409 path still consumed a budget hit (enumeration attempts are throttled).
5. The inserted OTP row is a 6-char digit string with `expiresAt ≈ now + 15 min`.

**`verifySmartCaptcha` (`lib/smartcaptcha.ts`):** no key set → `true` **without** calling fetch
(dev skip); key set + empty token → false, no fetch; `{status:'ok'}` → true, and the POSTed body
carries secret+token+ip; `ok:false` / `{status:'failed'}` / fetch rejects → **all false**.
Fail-closed is the load-bearing property — a well-meaning "don't block users when Yandex is
down" edit flips it to fail-open, and this test is the only tripwire. Plus the abort path with
fake timers.

### C4. Password reset — P0

**Why it is special:** `forgot-password` must return a **byte-identical** body for existing and
non-existing emails while spending the 3/email + 15/IP budget on both paths; `reset-password`
must delete the token on use **and** on expiry — a token surviving a successful reset is an
account-takeover window replayable from browser history or a forwarded email.

1. Found vs not-found → deep-equal the two JSON bodies **and** statuses; `sendPasswordResetEmail`
   called only in the found case.
2. Three requests for one email → the 4th is 429 regardless of whether the account exists (no
   enumeration through the limiter either).
3. The token in the email URL is 64 hex chars and matches the inserted row, `expiresAt ≈ now+1h`.
4. Existing tokens for the email are deleted **before** the insert.
5. `reset-password` valid token → `users.update` captured with a hash **and**
   `db.delete(passwordResetTokens)` called with that token; re-run with the row queue now empty
   → 400 «Неверный или истёкший токен» (the single-use / takeover-window test).
6. `expiresAt` in the past → 400 **and** the expired row is deleted.
7. `password.length < 6` → 400 before any DB read.
8. The update predicate is `eq(users.email, resetToken.email)` — the documented path by which an
   OAuth-only user gains a password.

### C5. Telegram webhook authenticity — P0

**Why it is special:** the header check is the **only** auth; the body (including `chat.id`) is
attacker-controlled. The length-equality guard before `crypto.timingSafeEqual` is load-bearing —
`timingSafeEqual` **throws** on unequal-length buffers, so removing the guard turns every
wrong-length probe into a 500 through the catch block.

`vi.mock('@/lib/telegramClient', () => ({ bot: { handleUpdate: vi.fn() } }))` stubs Telegraf
entirely (no token, no network) and skips the module's handler registration.

1. Correct header → 200 `{ok:true}`, `handleUpdate` received the parsed body.
2. Wrong same-length secret → 401, `handleUpdate` not called.
3. **Missing header → 401, not 500.** Exactly what breaks if the length guard is dropped.
4. Env secret unset → a request without the header still reaches `handleUpdate` (the deliberate
   dev degrade). Pin it so it stays deliberate.
5. `bot` null → 500 without throwing.

**The `callback_query` handler** (`lib/telegramClient.ts`, with `telegraf` mocked as a class
capturing registrations): answers «Кнопки отключены…», calls `editMessageReplyMarkup(undefined)`,
and — critically — never touches order status or booster credit. Pins that stale pre-2026-08-01
buttons stay inert.

### C6. Yandex OAuth identity mapping — P1

`lib/oauthUser.ts` → `getOrCreateUserFromYandex`, `yandexAvatarUrl`.

**Why it is special:** the three-way resolution order (oauth_accounts match → link by verified
email → create) decides whether a returning customer keeps their order history or silently gets
a duplicate account. No email → `null` → `signIn` returns false. Created users must have
`passwordHash` NULL. `backfillFromProfile` must never overwrite a user-chosen username — only
technical `uid-*` ones. The `signIn` callback **rewrites the `user` object in place** so the jwt
callback stores the local UUID; if that breaks, tokens carry Yandex numeric ids and every DB
lookup keyed on `token.id` misses.

1. No `default_email` and empty `emails` → `null`, zero db calls.
2. A linked row exists → returns that user, **no** insert into `users`.
3. No link but a `users` row with the same email → an `oauth_accounts` insert with that userId,
   **no** new users insert, and the existing `passwordHash` untouched. The account-continuity
   test.
4. Fresh profile → users insert with `passwordHash: null` and an avatar from `yandexAvatarUrl`.
5. Backfill: username `'uid-12345'` gets renamed from the profile; `'Adilzhan'` is left alone.
6. `yandexAvatarUrl`: `is_avatar_empty` → null; missing id → null; else the islands-200 URL.
7. `signIn` callback: non-yandex provider → true without calling the helper; helper returns null
   → false; helper returns a row → true **and** the passed `user` object was mutated to the local
   id/email/role.

### C7. The rate-limit primitive — P1

`lib/rateLimit.ts`, `lib/apiRateLimit.ts`. Everything above stands on ~90 lines.

1. 100 consecutive `checkRateLimit` calls with limit 5 all succeed with `remaining === 5` —
   **peek never records**. (A check that recorded would count blocked attempts and never unlock.)
2. Record 5, then check → `success:false` with `retryAfterSec` derived from the **oldest** live
   hit; advance past just that hit → allowed again with `remaining 1`. True sliding window, not
   fixed buckets.
3. `resetRateLimit` clears only its own key.
4. `getClientIp`: `Headers` with `'1.2.3.4, 10.0.0.1'` → `'1.2.3.4'`; a plain map with a
   mixed-case key; a `string[]` value → first element; `x-real-ip` fallback; undefined →
   `'unknown'`.
5. The module-level `setInterval` is unref'd (cheap smoke test).
6. `enforceRateLimit`: an authenticated identifier with two **different** `x-forwarded-for`
   values shares one budget (the documented spoof-proofing); anonymous requests get independent
   per-IP budgets; the same identity across buckets `'checkout'` vs `'sync'` has independent
   counters; the over-limit response is a 429 `NextResponse` with a Russian body and an integer
   `Retry-After`; exactly `limit` calls pass and `limit+1` blocks (record-on-allow semantics — a
   swap to record-always shifts this off-by-one).

### C8. Middleware role matrix — P1

`middleware.ts`, plus `getBoosterContext` and `requireAdminApi`.

**Why it is special:** an **admin hitting `/portal` is redirected** — roles are exact-match, not
hierarchical. Pin it, so nobody "helpfully" lets admins into the portal and breaks the
`boosters.userId` identity model. API paths get JSON 401/403 while page paths get redirects with
`?auth=required`.

1. Table-driven, 16 cells: `{no token, user, admin, booster} × {/admin, /api/admin, /portal,
   /api/portal}`. Assert 401 JSON for anonymous API, 403 JSON for wrong-role API, a redirect to
   `/` with `auth=required` for anonymous pages, a plain `/` redirect for wrong-role pages, and
   `NextResponse.next()` only for the exact matching role.
2. `getBoosterContext`: role `'admin'` with a valid roster row → `null` (role gate first, no db
   call); role `'booster'` but db returns `[]` → null; an **inactive** roster row → null (the
   money-visibility gate); happy path returns `{userId, booster}`.
3. `requireAdminApi`: role `'user'` → 403 `NextResponse`; `'admin'` → null.
4. `expectedCut('1000.00', 40) === 400` and `expectedCut('999.99', 40) === 400`
   (`Math.round(39999.6)/100`) — pins the cent rounding.

### C9. Registration finalize — P1

**Why it is special:** the OTP is looked up by email and compared by plain string inequality;
expiry is checked **after** the code match, and the row is deleted **only on success** — so a
wrong guess does not invalidate the code. Combined with the 8/min tier that is ~11 000 guesses
per day against a 6-digit code. Pin today's behaviour **and** fix it (see
`TEST_BEFORE_MERGE.md` §7).

1. Wrong OTP → 400 «Неверный код» and the `otps` row **not** deleted.
2. Expired-but-correct → 400 «Код истек».
3. Success → users insert with `receiptEmail === email` and a bcrypt hash, **then** the otps
   delete.
4. `db.insert` throws `{code:'23505'}` → 409 with the generic combined message (no field-level
   enumeration).
5. Password of 5 chars → 400 before any DB read.
6. Ninth call in a minute from one IP → 429.

### C10. Security headers and CSP drift — P2

`next.config.ts` — `headers()` is an async function callable directly, no server needed. Use
`vi.stubEnv('NODE_ENV','production')` + `vi.resetModules()` + dynamic import so `isProd`
re-evaluates.

1. Rule 0 applies the headers to `'/:path*'`, and HSTS has **no** `includeSubDomains` (the
   documented deliberate omission).
2. Production adds exactly one `Content-Security-Policy-Report-Only` rule — asserting the **key
   name** means a premature rename to enforcing mode fails a test, forcing the console-clean
   checklist first — whose source is `'/((?!banner.html).*)'`.
3. The CSP value contains each required origin: `mc.yandex.ru` in script-src and connect-src,
   `mc.yandex.com` in connect-src, `smartcaptcha.cloud.yandex.ru` in script/connect/frame,
   `storage.yandexcloud.net` and `avatars.yandex.net` in img-src, `frame-ancestors 'self'`.
4. Non-production → no CSP rule at all.

---

## 5. Backlog — tranches D, E, F (not selected)

Recorded so the audit is not lost. Roughly 85 further tests.

### D. Cart and optimistic statuses (~30)

- **`syncToDb` serialisation** — at most one POST in flight plus one trailing POST whose body is
  read at send time. This is the fix for a measured production bug: deleting everything produced
  progressively smaller (faster) requests, the older bigger snapshot landed last, and deleted
  lines resurrected. Also: `setPendingSync(false)` is skipped while another mutation is queued,
  so the pending flag must stay set across a burst. Concurrent `syncToDb()` calls must return the
  **same promise object**.
- **`loadFromDb`** — the revision guard (a slow GET issued before a mutation must be discarded);
  `merge:true` union semantics (DB wins on quantity, browser-only lines survive, an `addonChoice`
  on **either** side survives); push-back when the browser contributed.
- **`CartSync`** — merges once per userId; writes `cart-merged-for` even on the push branch;
  keyed on `session.user.id` **not** the session object (the tab-focus refetch bug).
- **`resolveDisplayStatus`** — the full precedence ladder: a real terminal status wins and clears
  both markers; just-completed upgrades pending/paid/in_progress; just-paid upgrades **only**
  pending; observing any non-pending real status retires the paid marker; 15-min TTL with lazy
  prune; `'cancelled'` + a just-paid marker → `'cancelled'` (optimism must never mask a
  cancellation); malformed JSON in sessionStorage → real status, no throw.
- **`/api/user/order-events`** — completed outranks paid for the same order (claiming completed
  stamps **both** flags); a claim returning zero rows (lost race to another tab) continues to the
  next candidate; unauth and db-error both answer `{event:null}` with status 200 (the poller
  treats non-ok as retry-later).
- **`OrderEventWatcher`** — latest-request-wins (`reqIdRef`), which fixed "a stale response
  reopened the closed modal"; `busyRef` one-modal-at-a-time; suppression on `/cart`, `/admin`,
  `/portal` and hidden tabs; and — because the server has **already** stamped the event seen by
  the time the client holds it — all display side effects must fire (`markJustPaid` /
  `markJustCompleted`, the `wa:orders-changed` broadcast, the review-prompt snooze).

### E. Admin and portal (~30)

- Admin order `PATCH` state machine: the **first** booster assignment flips status to
  `in_progress` only when `body.status` is undefined and the order has no booster; re-assignment
  must **not** touch status; `'paid'` and `'refunded'` are deliberately absent from the allowed
  transitions. `DELETE`: `completed`/`paid` → 409 with `db.delete` never called; `refunded` →
  deleted; missing → 404.
- Portal `in_progress → completed`: scoped by `orders.boosterId`, **404 not 403** to avoid
  existence leaks; credits commission, sends the exactly-once customer email, notifies the admin.
  Hazard: a Telegram failure currently 500s **after** the order was completed and credited — pin
  the current behaviour explicitly.
- Manual order: total recomputed server-side, duplicate lines merged, test services and unknown
  ids hard-rejected, promocode validated against the **chosen customer**.
- Refund gate: `Number.isFinite(paymentId)` is the only thing stopping an admin from "refunding"
  a `MANUAL`/`TEST` order through the Freekassa API; the status must be untouched when the FK
  call fails.
- **`notTestOrder` tripwire** — the invariant is spread across ~8 files and enforced only by
  discipline. Two forms: assert the SQL fragment via `.toSQL()` on a pg-proxy instance, and a
  source-text guard (`fs.readFileSync`, no imports) over a hardcoded list of money surfaces. A
  new dashboard query that forgets the filter silently inflates revenue.
- Booster link/unlink: `users.role` and `boosters.userId` must always move together, or
  `getBoosterContext` rejects the orphan and the booster is silently locked out of `/portal`.
- Dashboard window/bucket maths: the bucket index is defined **twice** (`dayBucket()` in JS for
  axis labels, `bucketExpr()` in SQL), and a mismatch silently shifts revenue into the wrong bar.
  The quarter/year month offset **must** be inlined via `sql.raw` — a bound parameter makes
  Postgres fail outright. Needs a small extraction from `app/admin/page.tsx` into
  `app/admin/_components/dashboardQueries.ts`.
- Server-side pagination SQL, including the correlated-subquery regression: the users route's
  `spentAggregate` once emitted an **unqualified** `"user_id" = "id"` (both bound to `orders`) and
  showed 0 spent for everyone.

### F. Frontend components (~25)

- **`inclusiveDayCount`** — `round(diff/86400000) + 1`; 28/07 → 29/07 is **2** days, and that
  number becomes the cart quantity, so `quantity × price/day` is the order total. An off-by-one
  mis-prices every per-day order. **Requires a small refactor first:** extract
  `inclusiveDayCount` and `toLocalYMD` from `ClientServicePage` into `lib/dateRange.ts` (pure
  move). Set `process.env.TZ = 'Europe/Moscow'` in the vitest config to make `toLocalYMD`
  testable.
- **`ServiceCard` / `ClientServicePage`** — `item.hasQuestAddons` must be passed as the 4th
  argument from **every** call site; if one drops it, the modal simply never opens and the
  post-incident design dies silently.
- **`HomeClient`** — `status === 'loading' ? initialSession : clientSession` (the anti-guest-flash
  pattern); `?status=success&order=abc` → `markJustPaid` before `router.replace`; effects keyed on
  `session.user.id`, not the session object.
- **`/orders`** — deliberate asymmetry a cleanup would "fix" into a bug: **sorting** ranks by
  `resolveDisplayStatus` while **polling cadence** keys on the **real** status.
- **`AuthModal`** — the four-state registration machine (form → captcha → otp → success), the
  single-use captcha token (a failed send-otp must reset the widget or the user is stuck), and
  the `RATE_LIMITED` → «Слишком много попыток входа» mapping while ordinary failures keep the
  generic message.
- **`CustomDateRangePicker`** — `minValue`/`maxValue` must be repeated on `<RangeCalendar>`;
  HeroUI takes the calendar as an explicit child so the root's bounds do not propagate. This has
  bitten once already.
- **`CustomSelect`** — one assertion,
  `within(getByRole('listbox')).getAllByRole('option').length === 5`, is the whole regression test
  for the documented a11y bug (role on the outer menu with a scroll container between drops every
  option from the accessibility tree).
- **`ReviewsMasonry`** — every review renders **exactly once** across the three columns whatever
  the text lengths.
- **`ReviewPrompt`** — sessionStorage-only snooze (a permanent localStorage flag once muted the
  prompt forever after one accidental backdrop click).

### Deliberately **not** recommended

- **E2E against the dev server or the VM.** `DATABASE_URL` points at production through the
  tunnel, so any "just run it against localhost:3000" test is a production-database test.
- **The `UPDATE ... RETURNING` atomicity of the order-events claim** — only real Postgres proves
  it; the loop logic around it is the testable part.
- **Modal enter/exit animation choreography** — timing cosmetics.
- **Header session-flash tests** — the «Войти» → avatar flash is a documented, accepted trade-off
  pending a layout-level session read. A test would freeze a known-imperfect behaviour.
- **Coverage thresholds.** At this size they produce tests written to satisfy a number.
- Decorative components (`HeroShowcase`, `DivePath`, `EventBanner`).

---

## 6. What the existing tests already cover — do not rewrite them

5 files, 57 tests, ~1.9 s, zero DB and zero network (fetch stubbed, `next/image` and
`next/navigation` mocked). They are regression-anchored, not coverage theatre:

- `store/__tests__/useCart.test.ts` replays the exact production data-loss bug («удалил всё,
  перешёл на страницу, товары вернулись»), including the module-reload-with-surviving-localStorage
  trick via `vi.resetModules()`. Its `loadStore()` / `mockFetch` helpers should be extracted into
  `test/utils/` and reused.
- `CartModal`, `ConfirmDialog`, `OrderCard`, `CustomInput` each test the public contract that call
  sites depend on: promise lifecycle, badge visibility rules, class-composition API.

`vitest.setup.ts` correctly polyfills `matchMedia` / `ResizeObserver` / pointer-capture for vaul
and Radix. `vitest.config.mts` sensibly skips `@vitejs/plugin-react` (Babel 8 peer-dependency
conflict) — keep that, and keep `globals: false`.
