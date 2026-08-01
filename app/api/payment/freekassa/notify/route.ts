import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, promocodes, promocodeUsage } from '@/lib/schema';
import { and, eq, isNull, or } from 'drizzle-orm';
import {
  verifyFreekassaNotification,
  FREEKASSA_NOTIFY_IPS,
  shouldCheckNotifyIp,
} from '@/lib/freekassa';
import {
  ADDON_CHOICE_TELEGRAM_LABEL,
  isAddonChoice,
  isQuestGatedAndUndeclared,
} from '@/lib/addonChoice';

/**
 * Freekassa notification endpoint.
 *
 * Freekassa sends a POST (application/x-www-form-urlencoded) with fields:
 *   MERCHANT_ID            — shop id
 *   AMOUNT                 — paid amount (two decimals)
 *   intid                  — FK internal order id
 *   MERCHANT_ORDER_ID      — our order id (UUID) we sent as `paymentId`
 *   P_EMAIL                — payer email
 *   P_PHONE                — payer phone (optional)
 *   CUR_ID                 — currency id
 *   SIGN                   — md5(MERCHANT_ID:AMOUNT:SECRET2:MERCHANT_ORDER_ID)
 *   us_...                 — any custom params we added
 *
 * Expected response body: plain text "YES" on success. Anything else makes
 * Freekassa retry for up to 24h.
 */
export async function POST(req: NextRequest) {
  return handle(req);
}

// Some FK test tooling hits the URL with GET as a connectivity probe.
export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  try {
    console.log('[Freekassa] Notification received at:', new Date().toISOString(), req.method);
    // Never dump the raw headers here — they can carry forwarded auth/cookies.

    // 1. IP allow-list (optional hardening, enabled via FREEKASSA_CHECK_IP=true).
    if (shouldCheckNotifyIp()) {
      const xff = req.headers.get('x-forwarded-for') || '';
      const clientIp = xff.split(',')[0].trim() || req.headers.get('x-real-ip') || '';
      if (!FREEKASSA_NOTIFY_IPS.has(clientIp)) {
        console.warn('[Freekassa] Rejected notification from untrusted IP:', clientIp);
        return new NextResponse('forbidden', { status: 403 });
      }
    }

    // 2. Parse body. FK posts form-urlencoded; accept JSON too just in case.
    const contentType = req.headers.get('content-type') || '';
    let data: Record<string, string> = {};

    if (contentType.includes('application/json')) {
      const parsed = await req.json();
      data = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, String(v ?? '')])
      );
    } else {
      const form = await req.formData();
      form.forEach((v, k) => {
        data[k] = String(v);
      });
    }

    // Some deployments also put params in the query string. Merge those too.
    req.nextUrl.searchParams.forEach((v, k) => {
      if (!(k in data)) data[k] = v;
    });

    // Log only what traces a payment — the full payload carries P_EMAIL / P_PHONE (customer PII).
    console.log('[Freekassa] notify', { order: data.MERCHANT_ORDER_ID, amount: data.AMOUNT });

    const merchantId = data.MERCHANT_ID;
    const amount = data.AMOUNT;
    const merchantOrderId = data.MERCHANT_ORDER_ID;
    const sign = data.SIGN;
    const fkOrderId = data.intid;

    if (!merchantId || !amount || !merchantOrderId || !sign) {
      console.warn('[Freekassa] Missing required parameters:', data);
      return new NextResponse('missing parameters', { status: 400 });
    }

    // 3. Verify signature.
    console.log('[Freekassa] Verifying signature for order:', merchantOrderId);
    const ok = verifyFreekassaNotification({
      merchantId,
      amount,
      merchantOrderId,
      sign,
    });
    if (!ok) {
      console.warn(`[Freekassa] Invalid signature for order ${merchantOrderId}`);
      console.warn(`[Freekassa] Received: merchantId=${merchantId}, amount=${amount}, sign=${sign}`);
      return new NextResponse('bad sign', { status: 400 });
    }
    console.log('[Freekassa] Signature verified successfully');

    // 4. Load the order and sanity-check the amount.
    console.log('[Freekassa] Loading order from database:', merchantOrderId);
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, merchantOrderId))
      .limit(1);

    if (orderRows.length === 0) {
      console.warn(`[Freekassa] Order not found: ${merchantOrderId}`);
      return new NextResponse('order not found', { status: 404 });
    }

    const order = orderRows[0];
    console.log('[Freekassa] Order found:', { id: order.id, status: order.status, totalPrice: order.totalPrice });
    // Check the amount
    if (parseFloat(amount) !== parseFloat(order.totalPrice.toString())) {
      console.warn(
        `[Freekassa] Amount mismatch for order ${merchantOrderId}. Expected ${order.totalPrice}, got ${amount}`
      );
      return new NextResponse('amount mismatch', { status: 400 });
    }
    console.log('[Freekassa] Amount verified successfully');

    // 5. Decide whether to (re)process this payment.
    //
    //    - `pending`: normal first-time payment confirmation.
    //    - `cancelled` with no paymentId: order was auto-cancelled by the
    //      cleanup job after the user took too long on the FK page. The
    //      payment is still legitimate, so re-open it and run full fulfillment.
    //    - any other status: already processed (paid, in_progress, completed,
    //      refunded, or admin-cancelled after payment). Answer YES so FK
    //      stops retrying, but DO NOT re-run fulfillment.
    if (order.status === 'cancelled' && !order.paymentId) {
      console.warn(
        `[Freekassa] Late payment on auto-cancelled order ${merchantOrderId}. Re-opening and running fulfillment.`
      );
    }

    // 6. ATOMIC claim of the paid transition. The eligibility check lives in
    //    the UPDATE's WHERE, not in a separate read: FK retries webhooks
    //    aggressively and two deliveries used to both observe `pending` and
    //    both run fulfillment (double email/telegram/promocode). Whichever
    //    delivery wins this UPDATE fulfils; everyone else gets 0 rows.
    //    Eligible: `pending` (normal), or `cancelled` with no paymentId (the
    //    cleanup job auto-cancelled while the customer was still paying).
    const updateResult = await db
      .update(orders)
      .set({
        status: 'paid',
        paymentId: fkOrderId ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, order.id),
          or(eq(orders.status, 'pending'), and(eq(orders.status, 'cancelled'), isNull(orders.paymentId)))
        )
      )
      .returning();

    if (updateResult.length === 0) {
      // Already processed (by a concurrent delivery or long ago). If the order
      // is in a paid-family status, use this free retry to re-attempt a
      // previously failed confirmation email — the claim inside makes it a
      // no-op when the email already went out.
      console.log(
        `[Freekassa] Order ${merchantOrderId} already processed with status: ${order.status}, skipping fulfillment.`
      );
      if (['paid', 'in_progress', 'completed'].includes(order.status ?? '')) {
        try {
          const { claimAndSendPaidEmail } = await import('@/lib/orderEmails');
          await claimAndSendPaidEmail(order.id, { recipientHint: data.P_EMAIL || undefined });
        } catch (e) {
          console.error('[Freekassa] paid-email retry failed:', e);
        }
      }
      return new NextResponse('YES', { status: 200 });
    }

    console.log(`[Freekassa] Order ${merchantOrderId} successfully PAID (fk intid=${fkOrderId}).`);

    // 6.5. Record promocode usage now that payment is confirmed.
    if (order.promocode && order.userId) {
      console.log('[Freekassa] Recording promocode usage:', order.promocode);
      try {
        const [promoRecord] = await db
          .select()
          .from(promocodes)
          .where(eq(promocodes.code, order.promocode))
          .limit(1);

        if (promoRecord) {
          await db.insert(promocodeUsage).values({
            promocodeId: promoRecord.id,
            userId: order.userId,
            orderId: order.id,
          });
          console.log('[Freekassa] Promocode usage recorded successfully');
        }
      } catch (promoError) {
        console.error('[Freekassa] Failed to record promocode usage:', promoError);
      }
    }

    // 7. Notify admin via Telegram (best effort — never fail the webhook for this).
    try {
      const { notifyAdminAboutOrder } = await import('@/lib/telegramClient');
      const { orderItems, services, serviceAddons } = await import('@/lib/schema');
      const { eq: eqInner, inArray } = await import('drizzle-orm');

      const items = await db
        .select({
          serviceId: orderItems.serviceId,
          title: services.title,
          quantity: orderItems.quantity,
          price: orderItems.priceAtPurchase,
          startDate: orderItems.startDate,
          endDate: orderItems.endDate,
          addonChoice: orderItems.addonChoice,
        })
        .from(orderItems)
        .leftJoin(services, eqInner(orderItems.serviceId, services.id))
        .where(eqInner(orderItems.orderId, merchantOrderId));

      // Quest-addon links for the ordered services, to detect the "silent"
      // case: a quest-gated (exploration) service bought with no declaration
      // and none of its quest services in the order — the upsell modal never
      // ran (or the client dropped the quests in the cart). The admin must
      // know to clarify with the client instead of assuming there's nothing.
      const orderedServiceIds = items
        .map((i) => i.serviceId)
        .filter((id): id is string => Boolean(id));
      const addonLinks = orderedServiceIds.length
        ? await db
            .select({
              parentServiceId: serviceAddons.parentServiceId,
              addonServiceId: serviceAddons.addonServiceId,
            })
            .from(serviceAddons)
            .where(inArray(serviceAddons.parentServiceId, orderedServiceIds))
        : [];
      const addonIdsByParent = new Map<string, string[]>();
      for (const link of addonLinks) {
        const list = addonIdsByParent.get(link.parentServiceId) ?? [];
        list.push(link.addonServiceId);
        addonIdsByParent.set(link.parentServiceId, list);
      }
      const orderedIdSet = new Set(orderedServiceIds);

      const itemsDescription = items
        .map((i) => {
          let desc = `- ${i.title}`;

          // Show period for account management service
          if (i.startDate && i.endDate) {
            const start = new Date(i.startDate).toLocaleDateString('ru-RU');
            const end = new Date(i.endDate).toLocaleDateString('ru-RU');
            desc += ` (${start} - ${end})`;
          } else {
            desc += ` (x${i.quantity})`;
          }

          desc += ` - ${i.price} руб.`;

          // Quest-addon declaration from the upsell modal — the booster must
          // know whether the gating quests are on the client.
          const linkedAddonIds = i.serviceId
            ? addonIdsByParent.get(i.serviceId)
            : undefined;
          // Same predicate the /api/checkout gate rejects on, so this warning
          // can never drift out of sync with what is actually blocked.
          const undeclared = isQuestGatedAndUndeclared(
            linkedAddonIds,
            i.addonChoice,
            orderedIdSet
          );

          if (undeclared) {
            desc +=
              i.addonChoice === 'quests'
                ? // Ticked the quests in the modal, then removed those lines from
                  // the cart. Checkout rejects this now, so it should only ever
                  // show up on an order created before that gate shipped.
                  '\n  ❗ Клиент выбрал задания, но затем удалил их из корзины — уточните у клиента'
                : '\n  ❗ Услуга с заданиями, но клиент не сделал выбор — уточните у клиента';
          } else if (isAddonChoice(i.addonChoice)) {
            desc += `\n  ⚠️ ${ADDON_CHOICE_TELEGRAM_LABEL[i.addonChoice]}`;
          }
          return desc;
        })
        .join('\n');

      await notifyAdminAboutOrder({
        id: merchantOrderId,
        totalAmount: amount,
        itemsDescription,
        userNotes: order.userNotes,
      });
    } catch (tgError) {
      console.error('[Telegram] Failed to send admin notification:', tgError);
    }

    // 8. Send the confirmation email — exactly-once via the DB claim in
    //    lib/orderEmails (paid_email_sent_at). Best effort; a failed send
    //    re-arms the claim and FK's next webhook retry re-attempts it.
    try {
      const { claimAndSendPaidEmail } = await import('@/lib/orderEmails');
      await claimAndSendPaidEmail(order.id, { recipientHint: data.P_EMAIL || undefined });
    } catch (emailError) {
      console.error('[Email] Failed to send order confirmation:', emailError);
    }

    // 9. Clear cart from database for logged-in users (best effort).
    if (order.userId) {
      try {
        const { cartItems } = await import('@/lib/schema');
        const { eq: eqInner } = await import('drizzle-orm');

        await db.delete(cartItems).where(eqInner(cartItems.userId, order.userId));
        console.log(`[Cart] Cleared cart for user ${order.userId}`);
      } catch (cartError) {
        console.error('[Cart] Failed to clear cart:', cartError);
      }
    }

    return new NextResponse('YES', { status: 200 });
  } catch (err) {
    console.error('[Freekassa Webhook Error]', err);
    return new NextResponse('internal error', { status: 500 });
  }
}
