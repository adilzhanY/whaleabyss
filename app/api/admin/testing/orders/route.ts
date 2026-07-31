import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services, users, boosters } from '@/lib/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { requireAdminApi } from '@/lib/auth/requireAdmin';
import { isTestOrder } from '@/lib/testOrders';

export const dynamic = 'force-dynamic';

/**
 * Test orders for /admin/testing. Deliberately the mirror image of
 * `/api/admin/orders`: same columns, opposite filter — everything the real list
 * hides ends up here, and nowhere else.
 */
export async function GET() {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  try {
    const rows = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
        paymentId: orders.paymentId,
        paymentMethod: orders.paymentMethod,
        isTestPayment: orders.isTestPayment,
        username: users.username,
        email: users.email,
        avatarUrl: users.avatarUrl,
        telegramUsername: users.telegramUsername,
        boosterId: orders.boosterId,
        boosterFirstName: boosters.firstName,
        boosterOnline: orders.boosterOnline,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(boosters, eq(orders.boosterId, boosters.id))
      .where(isTestOrder)
      .orderBy(desc(orders.createdAt));

    const orderIds = rows.map((o) => o.id);
    const itemRows = orderIds.length
      ? await db
          .select({
            orderId: orderItems.orderId,
            title: services.title,
            quantity: orderItems.quantity,
            startDate: orderItems.startDate,
            endDate: orderItems.endDate,
          })
          .from(orderItems)
          .leftJoin(services, eq(orderItems.serviceId, services.id))
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemsByOrder = new Map<string, typeof itemRows>();
    for (const item of itemRows) {
      if (!item.orderId) continue;
      const list = itemsByOrder.get(item.orderId);
      if (list) list.push(item);
      else itemsByOrder.set(item.orderId, [item]);
    }

    return NextResponse.json({
      orders: rows.map((o) => ({
        ...o,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : '',
        items: (itemsByOrder.get(o.id) ?? []).map((it) => ({
          title: it.title,
          quantity: it.quantity,
          startDate: it.startDate ? String(it.startDate) : null,
          endDate: it.endDate ? String(it.endDate) : null,
        })),
      })),
    });
  } catch (error) {
    console.error('[Test Orders Error]', error);
    return NextResponse.json({ error: 'Failed to fetch test orders' }, { status: 500 });
  }
}
