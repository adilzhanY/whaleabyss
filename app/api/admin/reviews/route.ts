import { NextRequest, NextResponse } from 'next/server';
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
        isFake: reviews.isFake,
        // For fake reviews the author lives in columns; for real ones in `users`.
        userName: sql<string | null>`COALESCE(${reviews.authorName}, ${users.username})`,
        userAvatar: sql<string | null>`COALESCE(${reviews.authorAvatarUrl}, ${users.avatarUrl})`,
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

// Create an admin-seeded fake review (is_fake=true, no user). The author name,
// optional avatar URL and a custom date are supplied by the admin; rating
// defaults to 5.0 and status is 'approved' so it shows up immediately.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { authorName, description, avatarUrl, date, rating } = body ?? {};

    const name = typeof authorName === 'string' ? authorName.trim() : '';
    const text = typeof description === 'string' ? description.trim() : '';

    if (!name || name.length > 255) {
      return NextResponse.json({ error: 'Имя обязательно (до 255 символов)' }, { status: 400 });
    }
    if (text.length < 2 || text.length > 1000) {
      return NextResponse.json({ error: 'Текст отзыва должен быть от 2 до 1000 символов' }, { status: 400 });
    }

    // Rating: default 5.0, accept 0.5–5.0.
    const ratingNum = rating == null || rating === '' ? 5 : parseFloat(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 0.5 || ratingNum > 5) {
      return NextResponse.json({ error: 'Рейтинг должен быть от 0.5 до 5' }, { status: 400 });
    }

    // Date: parse the admin-chosen day (YYYY-MM-DD) at noon UTC so the displayed
    // calendar day never shifts across timezones. Falls back to now.
    let createdAt: Date | undefined;
    if (typeof date === 'string' && date.trim()) {
      const parsed = new Date(`${date.trim()}T12:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Некорректная дата' }, { status: 400 });
      }
      createdAt = parsed;
    }

    const avatar =
      typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null;

    const [review] = await db
      .insert(reviews)
      .values({
        userId: null,
        rating: ratingNum.toFixed(1),
        description: text,
        status: 'approved',
        isFake: true,
        authorName: name,
        authorAvatarUrl: avatar,
        ...(createdAt ? { createdAt } : {}),
      })
      .returning();

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('[Admin Reviews POST Error]', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
