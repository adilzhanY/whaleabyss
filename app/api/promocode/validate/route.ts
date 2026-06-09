import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promocodes, promocodeUsage } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { enforceRateLimit, RATE_TIERS } from '@/lib/apiRateLimit';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const userId: string | null = session?.user?.id || null;

    if (!userId) {
      return NextResponse.json({ error: 'Необходимо войти в систему' }, { status: 401 });
    }

    // Cap promocode probing per account (brute-forcing valid codes).
    const limited = enforceRateLimit(req, 'promocode', RATE_TIERS.promocode, userId);
    if (limited) return limited;

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Промокод не указан' }, { status: 400 });
    }

    const upperCode = code.toUpperCase().trim();

    const [promocode] = await db
      .select()
      .from(promocodes)
      .where(eq(promocodes.code, upperCode))
      .limit(1);

    if (!promocode) {
      return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 });
    }

    if (new Date() > new Date(promocode.expiresAt)) {
      return NextResponse.json({ error: 'Промокод истёк' }, { status: 400 });
    }

    const [usage] = await db
      .select()
      .from(promocodeUsage)
      .where(
        and(
          eq(promocodeUsage.promocodeId, promocode.id),
          eq(promocodeUsage.userId, userId)
        )
      )
      .limit(1);

    if (usage) {
      return NextResponse.json({ error: 'Вы уже использовали этот промокод' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      code: promocode.code,
      discountPercent: promocode.discountPercent,
    });
  } catch (error) {
    console.error('[Promocode Validation Error]', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
