import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';
import { getBoosterContext } from '@/lib/portalAuth';
import { creditBoosterForCompletedOrder } from '@/lib/boosterPayout';
import { notifyAdminAboutBoosterStatusChange } from '@/lib/telegramClient';

/**
 * PATCH /api/portal/orders/[id] — booster actions on THEIR order:
 *
 *   { action: 'complete' }      — the only status transition a booster may
 *     make: in_progress → completed. Credits the commission (idempotent) and
 *     notifies the admin chat with full order + booster context.
 *   { boosterOnline: boolean }  — «я на аккаунте» toggle, only while the
 *     order is in_progress. Shown to the customer as a badge. NO notification.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getBoosterContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    const { booster } = ctx;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Scope: the order must belong to this booster. 404 (not 403) so the
    // route doesn't confirm the existence of other people's orders.
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.boosterId, booster.id)));
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // ── Online toggle ────────────────────────────────────────────────────
    if (typeof body.boosterOnline === 'boolean') {
      if (order.status !== 'in_progress') {
        return NextResponse.json(
          { error: 'Статус «на аккаунте» доступен только для заказов в работе' },
          { status: 400 }
        );
      }
      await db
        .update(orders)
        .set({ boosterOnline: body.boosterOnline, updatedAt: new Date() })
        .where(eq(orders.id, id));
      return NextResponse.json({ success: true, boosterOnline: body.boosterOnline });
    }

    // ── Complete ─────────────────────────────────────────────────────────
    if (body.action === 'complete') {
      if (order.status !== 'in_progress') {
        return NextResponse.json(
          { error: 'Завершить можно только заказ в работе' },
          { status: 400 }
        );
      }

      await db
        .update(orders)
        .set({ status: 'completed', boosterOnline: false, updatedAt: new Date() })
        .where(eq(orders.id, id));

      await creditBoosterForCompletedOrder(id);

      // Customer «заказ выполнен» email — exactly-once via the DB claim
      // (the admin PATCH path shares the same claim).
      try {
        const { claimAndSendCompletedEmail } = await import('@/lib/orderEmails');
        await claimAndSendCompletedEmail(id);
      } catch (e) {
        console.error('[Portal] completed email failed:', e);
      }

      // Full context for the admin chat.
      const items = await db
        .select({ title: services.title, quantity: orderItems.quantity })
        .from(orderItems)
        .leftJoin(services, eq(orderItems.serviceId, services.id))
        .where(eq(orderItems.orderId, id));
      const itemsDescription =
        items.map((i) => `• ${i.title ?? 'Услуга'} ×${i.quantity ?? 1}`).join('\n') || '—';

      await notifyAdminAboutBoosterStatusChange({
        orderId: id,
        newStatus: 'completed',
        boosterName: `${booster.firstName} ${booster.lastName}`,
        boosterTelegram: booster.telegramUsername,
        totalAmount: Number(order.totalPrice).toLocaleString('ru-RU'),
        itemsDescription,
        userNotes: order.userNotes,
      });

      return NextResponse.json({ success: true, status: 'completed' });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error) {
    console.error('[Portal Order PATCH Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
