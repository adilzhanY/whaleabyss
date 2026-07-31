import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services, cartItems } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { requireAdminApi } from '@/lib/auth/requireAdmin';
import { isAddonChoice } from '@/lib/addonChoice';

/**
 * ADMIN-ONLY: turn the current cart into a PAID order without any payment.
 *
 * Why it exists: to see how a live order actually looks to the customer — the
 * active-boost card on «Мои заказы», the booster's portal, the status flow —
 * without spending money. The sibling route `/api/admin/testing/checkout` does
 * the opposite (a real FreeKassa charge to validate the payment channel).
 *
 * The order is created SILENTLY and deliberately differs from a real one:
 *   - `isTestPayment = true`, which `lib/testOrders.ts` filters out of every
 *     admin report, the orders list, the notifier and booster payouts;
 *   - `paymentId = 'TEST'`, so the cleanup job never treats it as abandoned
 *     (it only deletes cancelled orders whose paymentId is NULL);
 *   - no Telegram message, no customer e-mail, no admin toast.
 *
 * Prices are recomputed from the DB — the client's numbers are ignored, exactly
 * like the public checkout. The quest-addon 409 gate is intentionally NOT
 * applied: an admin creating a test order has no client to ask.
 */
export async function POST(req: NextRequest) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  try {
    const session = await getServerSession(authOptions);
    const userId: string | null = session?.user?.id || null;
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 });
    }

    // Sum quantities per slug so a duplicated line can't create two rows.
    const qtyBySlug = new Map<string, number>();
    const datesBySlug = new Map<string, { startDate?: string; endDate?: string }>();
    const choiceBySlug = new Map<string, string>();
    for (const item of items) {
      const slug = typeof item?.id === 'string' ? item.id : null;
      const qty = Math.floor(Number(item?.quantity));
      if (!slug || !Number.isFinite(qty) || qty < 1) {
        return NextResponse.json({ error: 'Некорректная позиция' }, { status: 400 });
      }
      qtyBySlug.set(slug, (qtyBySlug.get(slug) ?? 0) + qty);
      if (item.startDate || item.endDate) {
        datesBySlug.set(slug, { startDate: item.startDate, endDate: item.endDate });
      }
      if (isAddonChoice(item.addonChoice)) choiceBySlug.set(slug, item.addonChoice);
    }

    const slugs = [...qtyBySlug.keys()];
    const rows = await db
      .select({ id: services.id, slug: services.slug, price: services.price })
      .from(services)
      .where(inArray(services.slug, slugs));

    if (rows.length !== slugs.length) {
      return NextResponse.json({ error: 'Услуга не найдена' }, { status: 400 });
    }

    let total = 0;
    const lines = rows.map((service) => {
      const quantity = qtyBySlug.get(service.slug) ?? 1;
      const price = Number(service.price);
      total += price * quantity;
      const dates = datesBySlug.get(service.slug);
      const choice = choiceBySlug.get(service.slug);
      return {
        serviceId: service.id,
        quantity,
        priceAtPurchase: price.toFixed(2),
        ...(dates?.startDate ? { startDate: new Date(dates.startDate) } : {}),
        ...(dates?.endDate ? { endDate: new Date(dates.endDate) } : {}),
        ...(choice ? { addonChoice: choice } : {}),
      };
    });

    const orderId = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          status: 'paid',
          totalPrice: total.toFixed(2),
          // Not NULL on purpose: the cleanup job only hard-deletes cancelled
          // orders with no paymentId, and 'MANUAL' is taken by real off-site
          // sales, which DO count as revenue.
          paymentId: 'TEST',
          isTestPayment: true,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));

      // Same as a real purchase: the cart is consumed.
      await tx.delete(cartItems).where(eq(cartItems.userId, userId));

      return order.id;
    });

    // No Telegram, no e-mail, no notifier — that is the whole point.
    return NextResponse.json({ success: true, orderId, total });
  } catch (error) {
    console.error('[Test Order Error]', error);
    return NextResponse.json({ error: 'Не удалось создать тестовый заказ' }, { status: 500 });
  }
}
