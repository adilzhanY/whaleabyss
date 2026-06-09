import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, users } from '@/lib/schema';
import { desc, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { enforceRateLimit, RATE_TIERS } from '@/lib/apiRateLimit';

export const dynamic = 'force-dynamic';

const fakeReviewUsers = [
  { id: "1849ded6-0403-42a3-aa00-5f7e58f5cbca", username: "lunar_vibes", avatar: "/images/reviews/ava1.jpg" },
  { id: "a96cb19d-f7de-483f-8ad1-392379f4d822", username: "glitchcore.kai", avatar: "/images/reviews/ava2.jpg" },
  { id: "355f0503-5382-477d-9dd2-e76b1d2bfb40", username: "starfragment", avatar: "/images/reviews/ava3.jpg" },
  { id: "cc5aceb3-1554-445f-9c81-9a99e5fdb65a", username: "voidwalker.exe", avatar: "/images/reviews/ava4.jpg" },
  { id: "402cb619-81fa-41af-9267-6d56aa8d5242", username: "cosmicrift", avatar: "/images/reviews/ava5.jpg" },
  { id: "f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c", username: "yusuri1x", avatar: "/images/reviews/ava6.jpg" },
  { id: "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c", username: "polarity", avatar: "/images/reviews/ava7.jpg" },
  { id: "f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c", username: "NEegmi", avatar: null },
  { id: "f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8c", username: "Иван", avatar: "/images/reviews/ava8.jpg" },
  { id: "f5a6b7c8-d9e0-4f1a-2b3c-4d5e6f7a8b9c", username: "Zangen", avatar: "/images/reviews/ava9.jpg" },
  { id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", username: "satorugojo", avatar: "/images/reviews/ava10.jpg" },
  { id: "f7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c", username: "karina", avatar: null },
  { id: "f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c", username: "Toff", avatar: "/images/reviews/ava11.jpg" },
  { id: "f9a0b1c2-d3e4-4f5a-6b7c-8d9e0f1a2b3c", username: "Аленааа", avatar: "/images/reviews/ava12.jpg" },
  { id: "f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c", username: "yanderee92", avatar: "/images/reviews/ava13.jpg" },
  { id: "f1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", username: "void_walker", avatar: "/images/reviews/ava14.jpg" },
  { id: "f2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d", username: "albi118", avatar: null },
  { id: "f3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d", username: "Kind Lioin", avatar: "/images/reviews/ava15.jpg" },
  { id: "f4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d", username: "zenitsuxz", avatar: null },
  { id: "f5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d", username: "AKAME", avatar: null },
];

export async function GET(req: NextRequest) {
  try {
    const limited = enforceRateLimit(req, 'reviews:read', RATE_TIERS.read);
    if (limited) return limited;

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

    // Map anonymous reviews to fake users based on review ID
    const enrichedReviews = reviewsData.map((review) => {
      if (!review.userId) {
        const fakeUser = fakeReviewUsers.find((fu) => fu.id === review.id);
        if (fakeUser) {
          return {
            ...review,
            userName: fakeUser.username,
            userAvatar: fakeUser.avatar,
          };
        }
      }
      return review;
    });

    return NextResponse.json({
      reviews: enrichedReviews,
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

    const limited = enforceRateLimit(req, 'reviews:write', RATE_TIERS.write, session.user.id);
    if (limited) return limited;

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
