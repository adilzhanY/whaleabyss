import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { boosterDocuments, orders } from '@/lib/schema';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { notTestOrder } from '@/lib/testOrders';
import { getBoosterContext } from '@/lib/portalAuth';

/**
 * GET /api/portal/me — the booster's own profile, revenue stats, and
 * document list. Legal data (name, birthDate, ИНН, реквизиты) is read-only
 * for the booster; changes go through the admin.
 */
export async function GET() {
  try {
    const ctx = await getBoosterContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    const { booster } = ctx;

    const [orderStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${orders.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')::int`,
        totalEarned: sql<string>`coalesce(sum(${orders.boosterEarning}), 0)::text`,
      })
      .from(orders)
      // notTestOrder: an admin rehearsal must not inflate the booster's stats —
      // the orders list already filters it, this aggregate had missed it.
      .where(and(eq(orders.boosterId, booster.id), notTestOrder));

    // Daily earnings for the last 14 days (completion date = updatedAt of a
    // completed order). Powers the dashboard sparkline and the weekly delta.
    // Deliberately from EARNINGS, not from balance: a payout resets the balance,
    // and a chart that collapses to zero on payday would read as a punishment.
    const dailyRows = await db
      .select({
        day: sql<string>`(date_trunc('day', ${orders.updatedAt}))::date::text`,
        earned: sql<string>`coalesce(sum(${orders.boosterEarning}), 0)::text`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.boosterId, booster.id),
          eq(orders.status, 'completed'),
          isNotNull(orders.boosterEarning),
          notTestOrder,
          sql`${orders.updatedAt} >= now() - interval '14 days'`
        )
      )
      .groupBy(sql`1`);

    // Dense 14-day series, oldest first — the client just draws bars.
    const byDay = new Map(dailyRows.map((r) => [r.day, Number(r.earned)]));
    const daily: { day: string; earned: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      daily.push({ day: key, earned: byDay.get(key) ?? 0 });
    }
    const weekEarned = daily.slice(-7).reduce((s, d) => s + d.earned, 0);

    // ── /portal/profile: career records + monthly earnings ────────────────
    // All from COMPLETED orders with a credited cut — same definition of
    // «заработано» as everywhere else. Completion date = updatedAt.
    const completedWhere = and(
      eq(orders.boosterId, booster.id),
      eq(orders.status, 'completed'),
      isNotNull(orders.boosterEarning),
      notTestOrder
    );

    const monthlyRows = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${orders.updatedAt}), 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
        earned: sql<string>`coalesce(sum(${orders.boosterEarning}), 0)::text`,
      })
      .from(orders)
      .where(completedWhere)
      .groupBy(sql`1`);

    const [speed] = await db
      .select({
        avgDays: sql<string>`coalesce(avg(extract(epoch from (${orders.updatedAt} - ${orders.createdAt}))) / 86400.0, 0)::text`,
      })
      .from(orders)
      .where(completedWhere);

    // Distinct weeks (as epoch of the week start) → consecutive-week streak.
    const weekRows = await db
      .select({
        week: sql<string>`extract(epoch from date_trunc('week', ${orders.updatedAt}))::bigint::text`,
      })
      .from(orders)
      .where(completedWhere)
      .groupBy(sql`1`);
    const weekSet = new Set(weekRows.map((r) => Number(r.week)));
    // Monday 00:00 UTC of the current week (Postgres truncates weeks to Monday;
    // the session runs in UTC, so the two clocks agree).
    const now = new Date();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    let cursor = monday.getTime() / 1000;
    const WEEK = 7 * 86400;
    // A streak may start on the previous week: no completion by Tuesday must
    // not read as «стрик потерян».
    if (!weekSet.has(cursor)) cursor -= WEEK;
    let weekStreak = 0;
    while (weekSet.has(cursor)) {
      weekStreak += 1;
      cursor -= WEEK;
    }

    // Dense last-6-months series, oldest first.
    const byMonth = new Map(monthlyRows.map((r) => [r.month, { count: r.count, earned: Number(r.earned) }]));
    const monthly: { month: string; orders: number; earned: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7);
      const hit = byMonth.get(key);
      monthly.push({ month: key, orders: hit?.count ?? 0, earned: hit?.earned ?? 0 });
    }

    const bestMonth = monthlyRows.reduce<{ month: string; earned: number } | null>((best, r) => {
      const earned = Number(r.earned);
      return earned > 0 && (!best || earned > best.earned) ? { month: r.month, earned } : best;
    }, null);

    const completedCount = orderStats?.completed ?? 0;
    const records = {
      bestMonth,
      avgDays: Number(speed?.avgDays ?? 0),
      weekStreak,
      avgOrder: completedCount > 0 ? Number(orderStats?.totalEarned ?? 0) / completedCount : 0,
    };

    const documents = await db
      .select({
        id: boosterDocuments.id,
        docType: boosterDocuments.docType,
        fileName: boosterDocuments.fileName,
        mimeType: boosterDocuments.mimeType,
        sizeBytes: boosterDocuments.sizeBytes,
        updatedAt: boosterDocuments.updatedAt,
      })
      .from(boosterDocuments)
      .where(eq(boosterDocuments.boosterId, booster.id));

    return NextResponse.json({
      profile: {
        firstName: booster.firstName,
        lastName: booster.lastName,
        birthDate: booster.birthDate,
        inn: booster.inn,
        payoutDetails: booster.payoutDetails,
        commissionPercent: booster.commissionPercent,
        startDate: booster.startDate,
      },
      revenue: {
        // Невыплаченный остаток (admin resets on payout).
        balance: Number(booster.balance),
        // Всё заработанное за время работы (sum of credited cuts).
        totalEarned: Number(orderStats?.totalEarned ?? 0),
        // Заработано за последние 7 дней + дневная серия за 14 (для спарклайна).
        weekEarned,
        daily,
      },
      // Личные рекорды и помесячный заработок — блоки /portal/profile.
      records,
      monthly,
      stats: {
        totalOrders: orderStats?.total ?? 0,
        activeOrders: orderStats?.active ?? 0,
        completedOrders: orderStats?.completed ?? 0,
      },
      documents,
    });
  } catch (error) {
    console.error('[Portal Me Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
