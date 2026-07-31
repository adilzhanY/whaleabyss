import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { boosters, boosterDocuments, orders, orderItems, services, users } from '@/lib/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const [booster] = await db.select().from(boosters).where(eq(boosters.id, id));
    if (!booster) {
      return NextResponse.json({ error: 'Качер не найден' }, { status: 404 });
    }

    // Portal account (if linked) — email shown in the admin UI.
    const [linkedUser] = booster.userId
      ? await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, booster.userId))
      : [];

    const assignedOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        boosterEarning: orders.boosterEarning,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        boosterOnline: orders.boosterOnline,
        userId: orders.userId,
        username: users.username,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.boosterId, id))
      .orderBy(desc(orders.createdAt));

    const completedCount = assignedOrders.filter((o) => o.status === 'completed').length;
    const activeCount = assignedOrders.filter((o) => o.status === 'in_progress').length;

    const orderIds = assignedOrders.map((o) => o.id);

    // Line items for every assigned order, so the table and the «сейчас в
    // работе» card can name the services without a second round trip.
    const items = orderIds.length
      ? await db
          .select({
            orderId: orderItems.orderId,
            title: services.title,
            quantity: orderItems.quantity,
          })
          .from(orderItems)
          .leftJoin(services, eq(orderItems.serviceId, services.id))
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemsByOrder = new Map<string, string[]>();
    for (const item of items) {
      if (!item.orderId || !item.title) continue;
      const list = itemsByOrder.get(item.orderId);
      if (list) list.push(item.title);
      else itemsByOrder.set(item.orderId, [item.title]);
    }

    // ── Performance ────────────────────────────────────────────────────────
    // Completion time is `updated_at - created_at` on completed orders: the
    // status flip is what stamps updatedAt, so it doubles as «когда закрыл».
    // The team average is the yardstick — a bare «5,7 дня» means nothing.
    const durations = assignedOrders
      .filter((o) => o.status === 'completed' && o.createdAt && o.updatedAt)
      .map((o) => new Date(o.updatedAt!).getTime() - new Date(o.createdAt!).getTime())
      .filter((ms) => ms > 0);
    const avgHours = durations.length
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length / 3_600_000) * 10) / 10
      : null;

    const [teamRow] = await db
      .select({
        hours: sql<string>`round(avg(extract(epoch from (${orders.updatedAt} - ${orders.createdAt})) / 3600)::numeric, 1)`,
      })
      .from(orders)
      .where(and(eq(orders.status, 'completed'), sql`${orders.boosterId} is not null`));
    const teamAvgHours = teamRow?.hours != null ? Number(teamRow.hours) : null;

    // Customers: how many people, and how many came back for a second order.
    const perCustomer = new Map<string, number>();
    for (const o of assignedOrders) {
      if (!o.userId) continue;
      perCustomer.set(o.userId, (perCustomer.get(o.userId) ?? 0) + 1);
    }
    const repeatCustomers = [...perCustomer.values()].filter((n) => n > 1).length;

    // Earnings per month, oldest first — six buckets, zero-filled.
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    const earningsByMonth: { month: string; earned: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      earningsByMonth.push({ month: monthKey(d), earned: 0 });
    }
    for (const o of assignedOrders) {
      if (!o.createdAt || o.boosterEarning == null) continue;
      const bucket = earningsByMonth.find((m) => m.month === monthKey(new Date(o.createdAt!)));
      if (bucket) bucket.earned += Number(o.boosterEarning);
    }

    // What this booster actually works on, most frequent first.
    const serviceCounts = new Map<string, number>();
    for (const item of items) {
      if (!item.title) continue;
      serviceCounts.set(item.title, (serviceCounts.get(item.title) ?? 0) + (item.quantity || 1));
    }
    const topServices = [...serviceCounts.entries()]
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Metadata only — the files themselves are streamed via the documents route.
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
      .where(eq(boosterDocuments.boosterId, id));

    return NextResponse.json({
      booster,
      linkedEmail: linkedUser?.email ?? null,
      documents,
      orders: assignedOrders.map((o) => ({
        ...o,
        items: itemsByOrder.get(o.id) ?? [],
      })),
      topServices,
      earningsByMonth,
      stats: {
        totalOrders: assignedOrders.length,
        completedOrders: completedCount,
        activeOrders: activeCount,
        totalEarned: assignedOrders.reduce((sum, o) => sum + Number(o.boosterEarning ?? 0), 0),
        avgHours,
        teamAvgHours,
        customers: perCustomer.size,
        repeatCustomers,
      },
    });
  } catch (error) {
    console.error('[Admin Booster GET Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.firstName !== undefined) {
      if (!body.firstName?.trim()) {
        return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 });
      }
      updates.firstName = body.firstName.trim();
    }
    if (body.lastName !== undefined) {
      if (!body.lastName?.trim()) {
        return NextResponse.json({ error: 'Фамилия не может быть пустой' }, { status: 400 });
      }
      updates.lastName = body.lastName.trim();
    }
    if (body.birthDate !== undefined) {
      updates.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    }
    if (body.telegramUsername !== undefined) {
      updates.telegramUsername = body.telegramUsername?.trim() || null;
    }
    if (body.inn !== undefined) {
      if (body.inn && !/^\d{12}$/.test(String(body.inn).trim())) {
        return NextResponse.json({ error: 'ИНН должен содержать 12 цифр' }, { status: 400 });
      }
      updates.inn = body.inn?.trim() || null;
    }
    if (body.payoutDetails !== undefined) {
      updates.payoutDetails = body.payoutDetails?.trim() || null;
    }
    if (body.commissionPercent !== undefined) {
      const commission = Number(body.commissionPercent);
      if (Number.isNaN(commission) || commission < 0 || commission > 100) {
        return NextResponse.json({ error: 'Комиссия должна быть от 0 до 100%' }, { status: 400 });
      }
      updates.commissionPercent = commission;
    }
    if (body.balance !== undefined) {
      const balance = Number(body.balance);
      if (Number.isNaN(balance) || balance < 0) {
        return NextResponse.json({ error: 'Баланс не может быть отрицательным' }, { status: 400 });
      }
      updates.balance = balance.toFixed(2);
    }
    if (body.status !== undefined) {
      updates.status = body.status === 'inactive' ? 'inactive' : 'active';
    }
    if (body.note !== undefined) {
      updates.note = body.note?.trim() || null;
    }
    if (body.startDate !== undefined) {
      updates.startDate = body.startDate ? new Date(body.startDate) : null;
    }

    const [updated] = await db
      .update(boosters)
      .set(updates)
      .where(eq(boosters.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Качер не найден' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Admin Booster PATCH Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Unlink the portal account first so no orphaned booster-role user stays.
    const [existing] = await db
      .select({ userId: boosters.userId })
      .from(boosters)
      .where(eq(boosters.id, id));
    await db.transaction(async (tx) => {
      if (existing?.userId) {
        await tx
          .update(users)
          .set({ role: 'user', updatedAt: new Date() })
          .where(eq(users.id, existing.userId));
      }
      await tx.delete(boosters).where(eq(boosters.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Booster DELETE Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
