import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, services } from '@/lib/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { getBoosterContext, expectedCut } from '@/lib/portalAuth';

/**
 * GET /api/portal/orders — orders assigned to the logged-in booster.
 *
 * Deliberately does NOT expose totalPrice: the booster sees only their cut
 * («вы получите»). For completed orders that's the credited boosterEarning;
 * for active ones it's computed from the commission percent.
 */
export async function GET() {
  try {
    const ctx = await getBoosterContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    const { booster } = ctx;

    const rows = await db
      .select({
        id: orders.id,
        status: orders.status,
        boosterOnline: orders.boosterOnline,
        boosterEarning: orders.boosterEarning,
        totalPrice: orders.totalPrice,
        userNotes: orders.userNotes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.boosterId, booster.id))
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

    const itemsByOrder = new Map<string, { title: string | null; quantity: number | null }[]>();
    for (const it of itemRows) {
      if (!it.orderId) continue;
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push({ title: it.title, quantity: it.quantity });
      itemsByOrder.set(it.orderId, arr);
    }

    return NextResponse.json(
      rows.map((o) => ({
        id: o.id,
        status: o.status,
        boosterOnline: o.boosterOnline,
        // Only the booster's cut — never the order total.
        earning:
          o.boosterEarning != null
            ? Number(o.boosterEarning)
            : expectedCut(o.totalPrice, booster.commissionPercent),
        earningCredited: o.boosterEarning != null,
        userNotes: o.userNotes,
        createdAt: o.createdAt,
        items: itemsByOrder.get(o.id) ?? [],
      }))
    );
  } catch (error) {
    console.error('[Portal Orders Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
