import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { boosterDocuments, orders } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
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
      .where(eq(orders.boosterId, booster.id));

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
      },
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
