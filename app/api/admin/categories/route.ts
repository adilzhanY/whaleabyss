import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(categories.order);

    return NextResponse.json(allCategories);
  } catch (error) {
    console.error('[Admin Categories GET Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { title, slug, description } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const maxOrderResult = await db
      .select({ maxOrder: categories.order })
      .from(categories)
      .orderBy(desc(categories.order))
      .limit(1);

    const nextOrder = maxOrderResult.length > 0 && maxOrderResult[0].maxOrder !== null
      ? maxOrderResult[0].maxOrder + 1
      : 0;

    const [newCategory] = await db
      .insert(categories)
      .values({
        title,
        slug,
        description: description || null,
        order: nextOrder,
      })
      .returning();

    return NextResponse.json(newCategory);
  } catch (error) {
    console.error('[Admin Categories POST Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
