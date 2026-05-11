import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { cartItems, services } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/cart/load
 * Load cart items from database for logged-in user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const userId: string | null = session?.user?.id || null;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Load cart items with service details
    const items = await db
      .select({
        id: cartItems.id,
        serviceId: services.slug,
        title: services.title,
        subtitle: services.subtitle,
        price: services.price,
        imageUrl: services.imageUrl,
        quantity: cartItems.quantity,
        startDate: cartItems.startDate,
        endDate: cartItems.endDate,
      })
      .from(cartItems)
      .leftJoin(services, eq(cartItems.serviceId, services.id))
      .where(eq(cartItems.userId, userId));

    // Transform to cart format
    const cartData = items.map((item) => ({
      id: item.serviceId || '',
      title: item.title || '',
      subtitle: item.subtitle || '',
      price: parseFloat(item.price || '0'),
      quantity: item.quantity || 1,
      image: item.imageUrl || '/images/genshin_background.jpg',
      ...(item.startDate ? { startDate: item.startDate.toISOString() } : {}),
      ...(item.endDate ? { endDate: item.endDate.toISOString() } : {}),
    }));

    return NextResponse.json({ items: cartData });
  } catch (error) {
    console.error('[Cart Load Error]', error);
    return NextResponse.json({ error: 'Failed to load cart' }, { status: 500 });
  }
}
