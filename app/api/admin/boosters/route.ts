import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { boosters, orders } from '@/lib/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const all = await db.select().from(boosters).orderBy(desc(boosters.createdAt));

    // Completed-order count per booster (shown in the list + assign modal).
    const withCounts = await Promise.all(
      all.map(async (b) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .where(and(eq(orders.boosterId, b.id), eq(orders.status, 'completed')));
        return { ...b, completedOrders: Number(count || 0) };
      })
    );

    return NextResponse.json(withCounts);
  } catch (error) {
    console.error('[Admin Boosters GET Error]', error);
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
    const {
      firstName,
      lastName,
      birthDate,
      telegramUsername,
      inn,
      payoutDetails,
      commissionPercent,
      status,
      note,
      startDate,
    } = body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'Имя и фамилия обязательны' }, { status: 400 });
    }

    const commission = commissionPercent == null ? 40 : Number(commissionPercent);
    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      return NextResponse.json({ error: 'Комиссия должна быть от 0 до 100%' }, { status: 400 });
    }

    if (inn && !/^\d{12}$/.test(String(inn).trim())) {
      return NextResponse.json({ error: 'ИНН должен содержать 12 цифр' }, { status: 400 });
    }

    const [created] = await db
      .insert(boosters)
      .values({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate ? new Date(birthDate) : null,
        telegramUsername: telegramUsername?.trim() || null,
        inn: inn?.trim() || null,
        payoutDetails: payoutDetails?.trim() || null,
        commissionPercent: commission,
        status: status === 'inactive' ? 'inactive' : 'active',
        note: note?.trim() || null,
        startDate: startDate ? new Date(startDate) : new Date(),
      })
      .returning();

    return NextResponse.json(created);
  } catch (error) {
    console.error('[Admin Boosters POST Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
