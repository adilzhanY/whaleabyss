import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, users } from '@/lib/schema';
import { and, desc, eq, isNull, ne, or } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

/**
 * Freshly-paid orders awaiting fulfilment — polled by the admin OrderNotifier
 * to fire the "kaching" + toast on new orders. Excludes admin-created manual
 * orders (paymentId='MANUAL'): the admin made those themselves, no alert needed.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select({
        id: orders.id,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
        username: users.username,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(
        and(
          eq(orders.status, 'paid'),
          or(isNull(orders.paymentId), ne(orders.paymentId, 'MANUAL'))
        )
      )
      .orderBy(desc(orders.updatedAt))
      .limit(15);

    return NextResponse.json({ orders: rows });
  } catch (error) {
    console.error('[Recent Paid Orders Error]', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
