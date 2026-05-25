import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, users, boosters } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ordersData = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
        paymentId: orders.paymentId,
        username: users.username,
        email: users.email,
        boosterId: orders.boosterId,
        boosterFirstName: boosters.firstName,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(boosters, eq(orders.boosterId, boosters.id))
      .orderBy(desc(orders.createdAt));

    return NextResponse.json({ orders: ordersData });
  } catch (error) {
    console.error('[Admin Orders API Error]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
