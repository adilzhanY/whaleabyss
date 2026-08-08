import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { debtPayments } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DEBT_TOTAL_USDT, DEBT_CREDITOR } from '@/lib/debt';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const payments = await db
      .select()
      .from(debtPayments)
      .orderBy(desc(debtPayments.paidAt));

    const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
      creditor: DEBT_CREDITOR,
      total: DEBT_TOTAL_USDT,
      paid,
      // Overpayment shouldn't render as a negative debt.
      remaining: Math.max(0, DEBT_TOTAL_USDT - paid),
      payments,
    });
  } catch (error) {
    console.error('[Admin Debt GET Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Сумма должна быть больше нуля' }, { status: 400 });
    }
    if (amount > 1_000_000) {
      return NextResponse.json({ error: 'Слишком большая сумма' }, { status: 400 });
    }

    // The picker sends a bare `YYYY-MM-DD`, which Date parses as UTC midnight —
    // that renders as the PREVIOUS day for any viewer west of UTC. Anchor
    // date-only values at midday so no real timezone can shift the date.
    const raw = typeof body.paidAt === 'string' ? body.paidAt : '';
    const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T12:00:00Z`)
      : raw
        ? new Date(raw)
        : new Date();
    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ error: 'Некорректная дата' }, { status: 400 });
    }

    const [payment] = await db
      .insert(debtPayments)
      .values({
        amount: amount.toFixed(2),
        paidAt,
        note: note || null,
      })
      .returning();

    return NextResponse.json(payment);
  } catch (error) {
    console.error('[Admin Debt POST Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
