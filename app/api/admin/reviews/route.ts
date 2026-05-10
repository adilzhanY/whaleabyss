import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, users } from '@/lib/schema';
import { desc, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviewsData = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        rating: reviews.rating,
        description: reviews.description,
        status: reviews.status,
        createdAt: reviews.createdAt,
        userName: users.username,
        userAvatar: users.avatarUrl,
      })
      .from(reviews)
      .leftJoin(users, sql`${reviews.userId} = ${users.id}`)
      .orderBy(desc(reviews.createdAt));

    return NextResponse.json({ reviews: reviewsData });
  } catch (error) {
    console.error('[Admin Reviews API Error]', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
