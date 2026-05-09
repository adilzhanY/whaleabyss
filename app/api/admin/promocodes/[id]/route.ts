import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promocodes } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    await db.delete(promocodes).where(eq(promocodes.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Promocode DELETE Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
