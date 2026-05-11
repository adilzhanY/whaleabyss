import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { cartItems, services } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/cart/sync
 * Sync cart items from localStorage to database for logged-in user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const userId: string | null = session?.user?.id || null;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    // Clear existing cart items for this user
    await db.delete(cartItems).where(eq(cartItems.userId, userId));

    // Insert new cart items
    if (items.length > 0) {
      // Get service IDs from slugs
      const slugs = items.map((item: any) => item.id);
      const dbServices = await db
        .select({ id: services.id, slug: services.slug })
        .from(services)
        .where(eq(services.slug, slugs[0])); // We'll query one by one to handle multiple

      // Build a map of slug -> service ID
      const slugToIdMap = new Map<string, string>();
      for (const slug of slugs) {
        const result = await db
          .select({ id: services.id, slug: services.slug })
          .from(services)
          .where(eq(services.slug, slug))
          .limit(1);
        if (result.length > 0) {
          slugToIdMap.set(result[0].slug, result[0].id);
        }
      }

      // Insert cart items
      const insertData = items
        .map((item: any) => {
          const serviceId = slugToIdMap.get(item.id);
          if (!serviceId) return null;

          return {
            userId,
            serviceId,
            quantity: item.quantity || 1,
            ...(item.startDate ? { startDate: new Date(item.startDate) } : {}),
            ...(item.endDate ? { endDate: new Date(item.endDate) } : {}),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (insertData.length > 0) {
        await db.insert(cartItems).values(insertData);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cart Sync Error]', error);
    return NextResponse.json({ error: 'Failed to sync cart' }, { status: 500 });
  }
}
