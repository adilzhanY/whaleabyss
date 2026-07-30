# Payment flow - short notes

How a purchase works in Whale Abyss, and where each part lives in the code.

## The two files

- `app/api/checkout/route.ts` - creates the order and sends the user to Freekassa.
- `app/api/payment/freekassa/notify/route.ts` - Freekassa tells us the user paid.

## Step by step

1. The user presses pay on `/cart`. The browser POSTs to `/api/checkout`.
2. We create an order with status `pending` and send back a Freekassa URL.
3. The user goes to Freekassa. **We see nothing during this time.** Nobody talks to us.
4. Freekassa sends a request to `/api/payment/freekassa/notify`.
5. We check it, set the status to `paid`, and answer with the text `YES`.

## Checkout - what happens before the order exists

| What | Where |
| --- | --- |
| Rate limit (10 per minute) | `checkout/route.ts:36` |
| Read services from the database | `checkout/route.ts:94-105` |
| Adventure Rank gate -> 422 | `checkout/route.ts:115-128` |
| Quest addon gate -> 409 | `checkout/route.ts:157-193` |
| Add up the total | `checkout/route.ts:195-205` |
| Insert the order (`pending`) | `checkout/route.ts:250-261` |
| Insert order items | `checkout/route.ts:264-287` |
| Ask Freekassa for a payment URL | `checkout/route.ts:298-306` |

**The browser sends only slugs and quantities. It never sends prices.** The server reads
the real price from the database. If we trusted the browser, a user could open DevTools
and buy a 2000 RUB service for 1 RUB.

**We save the price inside the order.** `priceAtPurchase` (`checkout/route.ts:281`) keeps
the price at the moment of buying. If we change a price later, old orders still show what
the customer really paid.

## The webhook - how we know it is really Freekassa

Our notify URL is public. Anyone can send a request to it. So we need proof.

Freekassa and we share a secret called `SECRET_2`. Nobody else has it. Freekassa takes
four values, joins them, and runs MD5 on them:

```
md5("shop_id:amount:SECRET_2:order_id")
```

It sends the result in the `SIGN` field. We do the same on our side and compare
(`notify/route.ts:94-104`, logic in `lib/freekassa.ts`). If it does not match we return
`400 bad sign` and stop.

A fake sender knows the shop id, the amount and the order id - those are not secret. But
they cannot build the right `SIGN`, because they do not have `SECRET_2`.

We also compare the amount with `orders.totalPrice` (`notify/route.ts:123-128`). If it does
not match we return `400 amount mismatch`, and the order stays `pending`. No Telegram, no
email. **When the money does not add up, do nothing and make noise.**

## Why the answer must be `YES`

This is one request and one response, like a phone call. Freekassa calls us and waits on
the line. `YES` is our answer inside that same call (`notify/route.ts:363`).

If we answer anything else, Freekassa thinks we did not receive it and **retries for up to
24 hours**. That is also why `cancelled` orders are kept for 1 day before deletion - a late
retry must still find its order.

## The same message can arrive many times

Because of those retries, we must be **idempotent**: doing it ten times must give the same
result as doing it once.

The guard is at `notify/route.ts:140-149`:

```ts
const isReopenableCancellation = order.status === 'cancelled' && !order.paymentId;
const shouldProcess = order.status === 'pending' || isReopenableCancellation;
if (!shouldProcess) return new NextResponse('YES', { status: 200 });
```

Any other status (`paid`, `in_progress`, `completed`, `refunded`) means someone already
handled it. We still answer `YES` so Freekassa stops retrying, but we do no work.

## The slow payer

`lib/orderCleanup.ts` cancels any order that is still `pending` after 1 hour. That removes
abandoned checkouts.

But a slow user may pay after 70 minutes. Their order is already `cancelled`, and their
money is real. So a `cancelled` order **with no `paymentId`** is treated as a first payment:
we set it to `paid` and do the full work.

An order that an admin cancelled after payment **has** a `paymentId`, so it can never be
re-opened by a repeated webhook.

**`paymentId` does two jobs: it stops double processing, and it tells a real cancellation
apart from an abandoned one.**

## Some steps are allowed to fail

Telegram (`notify/route.ts:196`), email (`:294`) and clearing the cart (`:351`) each sit in
their own `try/catch`. If one fails we log it and keep going.

Why: the order is already `paid` at that point. If we returned an error, Freekassa would
retry, and we would run the money code again just because a chat message failed. One small
failure would create a big one.

The rule:

| Step | When it runs | If it fails |
| --- | --- | --- |
| signature check | before anything | stop - we do not know if this is real |
| amount check | before anything | stop - the money does not add up |
| mark as `paid` | the important part | stop - this is the whole job |
| Telegram / email / cart | after the important part | log it, keep going, answer `YES` |

## Known weakness: a race condition

The handler reads the order (`:109`), decides (`:142`), then writes (`:159`). Those are
three separate steps, so there is a gap between reading and writing.

If Freekassa retries while the first request is still running, both copies read `pending`
before either writes `paid`. Both then send a Telegram message and an email.

```
copy A: SELECT -> 'pending' ... UPDATE -> 'paid'
copy B:              SELECT -> 'pending' (old answer) ... UPDATE -> 'paid'
```

Risk is low today (one small server, Freekassa does not retry that fast), and it has never
happened. But the correct fix is to make the read and the write one single step:

```sql
UPDATE orders SET status = 'paid'
WHERE id = $1 AND status = 'pending'
```

The database checks and writes at the same moment, so there is no gap. Then look at how
many rows changed: 1 row means "I was first, do the work"; 0 rows means "someone beat me,
just answer `YES`". In Drizzle, an empty `.returning()` array means 0 rows.

**Reading and then writing is two steps. Two steps have a gap. Do it in one step and the
gap disappears.**

The booster payout already uses this idea - `orders.boosterEarning` is filled once and acts
as the guard (`lib/boosterPayout.ts`).
