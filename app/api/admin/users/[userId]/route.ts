import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, orders, orderItems, services, reviews } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log('[API] Fetching user with ID:', userId);

    // Fetch user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    console.log('[API] User query result:', user ? 'Found' : 'Not found');

    if (!user) {
      console.log('[API] Returning 404 - User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user's orders with details
    const userOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        paymentId: orders.paymentId,
        userNotes: orders.userNotes,
        promocode: orders.promocode,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId));

    // Fetch user's reviews
    const userReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, userId));

    // Calculate total money spent (all orders except pending and cancelled)
    const revenueOrders = userOrders.filter(
      o => o.status !== 'pending' && o.status !== 'cancelled'
    );
    const totalSpent = revenueOrders.reduce((sum, order) => sum + Number(order.totalPrice), 0);

    // Get all order items for this user's revenue-generating orders
    const revenueOrderIds = revenueOrders.map(o => o.id);

    let topServices: Array<{ serviceId: string; title: string; count: number }> = [];

    if (revenueOrderIds.length > 0) {
      // Fetch order items with service details
      const items = await db
        .select({
          serviceId: orderItems.serviceId,
          quantity: orderItems.quantity,
          title: services.title,
        })
        .from(orderItems)
        .leftJoin(services, eq(orderItems.serviceId, services.id))
        .where(inArray(orderItems.orderId, revenueOrderIds));

      // Count service purchases
      const serviceCounts = new Map<string, { title: string; count: number }>();

      items.forEach(item => {
        if (item.serviceId && item.title) {
          const existing = serviceCounts.get(item.serviceId);
          const quantity = item.quantity || 1;

          if (existing) {
            existing.count += quantity;
          } else {
            serviceCounts.set(item.serviceId, {
              title: item.title,
              count: quantity,
            });
          }
        }
      });

      // Convert to array and sort by count
      topServices = Array.from(serviceCounts.entries())
        .map(([serviceId, data]) => ({
          serviceId,
          title: data.title,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        telegramUsername: user.telegramUsername,
        gameUsername: user.gameUsername,
        receiptEmail: user.receiptEmail,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      orders: userOrders,
      reviews: userReviews,
      stats: {
        totalSpent,
        totalOrders: userOrders.length,
        paidOrders: revenueOrders.length,
        totalReviews: userReviews.length,
      },
      topServices,
    });
  } catch (error) {
    console.error('Failed to fetch user details:', error);
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}
