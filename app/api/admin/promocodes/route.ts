import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promocodes, promocodeUsage } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const allPromocodes = await db.select().from(promocodes);

    const promoWithUsage = await Promise.all(
      allPromocodes.map(async (promo) => {
        const usageCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(promocodeUsage)
          .where(eq(promocodeUsage.promocodeId, promo.id));

        return {
          ...promo,
          usageCount: Number(usageCount[0]?.count || 0),
        };
      })
    );

    return NextResponse.json(promoWithUsage);
  } catch (error) {
    console.error('[Admin Promocodes GET Error]', error);
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
    const { code, discountPercent, expiresAt } = body;

    if (!code || !discountPercent || !expiresAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const upperCode = code.toUpperCase().trim();

    if (upperCode.length < 3 || upperCode.length > 10) {
      return NextResponse.json({ error: 'Code must be 3-10 characters' }, { status: 400 });
    }

    if (!/^[A-Z0-9]+$/.test(upperCode)) {
      return NextResponse.json({ error: 'Code must contain only uppercase letters and numbers' }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(promocodes)
      .where(eq(promocodes.code, upperCode))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Promocode already exists' }, { status: 400 });
    }

    const [newPromocode] = await db
      .insert(promocodes)
      .values({
        code: upperCode,
        discountPercent: Number(discountPercent),
        expiresAt: new Date(expiresAt),
      })
      .returning();

    return NextResponse.json(newPromocode);
  } catch (error) {
    console.error('[Admin Promocodes POST Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
