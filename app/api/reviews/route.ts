import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, users } from '@/lib/schema';
import { desc, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '5');

    // Fetch all approved reviews, ordered by newest first
    const reviewsData = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        rating: reviews.rating,
        description: reviews.description,
        createdAt: reviews.createdAt,
        userName: users.username,
        userAvatar: users.avatarUrl,
      })
      .from(reviews)
      .leftJoin(users, sql`${reviews.userId} = ${users.id}`)
      .where(sql`${reviews.status} = 'approved'`)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      reviews: reviewsData,
      hasMore: reviewsData.length === limit,
    });
  } catch (error) {
    console.error('[Reviews API Error]', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { rating, description } = body;

    if (!rating || !description) {
      return NextResponse.json({ error: 'Rating and description are required' }, { status: 400 });
    }

    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (description.trim().length < 10 || description.trim().length > 1000) {
      return NextResponse.json({ error: 'Description must be between 10 and 1000 characters' }, { status: 400 });
    }

    const [review] = await db
      .insert(reviews)
      .values({
        userId: session.user.id,
        rating: ratingNum.toString(),
        description: description.trim(),
      })
      .returning();

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('[Reviews POST Error]', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
