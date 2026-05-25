import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, reviews } from '@/lib/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

/**
 * Whether to nudge the logged-in user to leave a review: true when they have at
 * least one completed order and haven't left a review yet. Once they review (or
 * dismiss client-side) they stop being prompted.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ prompt: false });

    const [{ count: completed }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, 'completed')));

    const [{ count: reviewCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.userId, userId));

    return NextResponse.json({ prompt: completed > 0 && reviewCount === 0 });
  } catch (error) {
    console.error('[Review Prompt Error]', error);
    return NextResponse.json({ prompt: false });
  }
}
