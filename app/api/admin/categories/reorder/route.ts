import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { categoryOrders } = body;

    if (!Array.isArray(categoryOrders)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    for (const item of categoryOrders) {
      await db
        .update(categories)
        .set({ order: item.order })
        .where(eq(categories.id, item.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Categories Reorder Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
