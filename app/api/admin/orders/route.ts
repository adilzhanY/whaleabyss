import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  orders,
  orderItems,
  services,
  users,
  boosters,
  promocodeUsage,
} from '@/lib/schema';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { notTestOrder } from '@/lib/testOrders';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { validatePromocodeForUser } from '@/lib/promocodeValidation';

export const dynamic = 'force-dynamic';

const round2 = (n: number) => Math.round(n * 100) / 100;

const VALID_STATUSES = new Set([
  'pending', 'paid', 'in_progress', 'completed', 'cancelled', 'refunded',
]);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Server-side pagination + filtering. The orders list grows unbounded,
    // so we never ship the whole table: SQL does the filtering, sorting and
    // slicing, mirroring exactly what the client used to do in-memory. ---
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '10', 10) || 10));
    const sort = sp.get('sort') === 'oldest' ? 'oldest' : 'newest';
    const status = sp.get('status') || 'all';
    const startDate = sp.get('startDate') || '';
    const endDate = sp.get('endDate') || '';
    const search = (sp.get('search') || '').trim();

    const conditions: SQL[] = [];
    if (status !== 'all' && VALID_STATUSES.has(status)) {
      conditions.push(sql`${orders.status}::text = ${status}`);
    }
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) conditions.push(gte(orders.createdAt, start));
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999); // inclusive of the whole end day
        conditions.push(lte(orders.createdAt, end));
      }
    }
    if (search) {
      const like = `%${search}%`;
      conditions.push(
        or(
          sql`${orders.id}::text ILIKE ${like}`,
          ilike(orders.paymentId, like),
          ilike(users.username, like),
          ilike(users.email, like),
        )!,
      );
    }
    // Test orders live on /admin/testing only — never in the real list.
    conditions.push(notTestOrder as SQL);

    const whereExpr = and(...conditions);

    // Total matching rows (same filters, joined to users for name/email search),
    // for the pagination control.
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(whereExpr);
    const total = countRow?.count ?? 0;

    const ordersData = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
        paymentId: orders.paymentId,
        paymentMethod: orders.paymentMethod,
        isTestPayment: orders.isTestPayment,
        username: users.username,
        email: users.email,
        avatarUrl: users.avatarUrl,
        telegramUsername: users.telegramUsername,
        boosterId: orders.boosterId,
        boosterFirstName: boosters.firstName,
        boosterOnline: orders.boosterOnline,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(boosters, eq(orders.boosterId, boosters.id))
      .where(whereExpr)
      .orderBy(sort === 'oldest' ? asc(orders.createdAt) : desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Attach line items only for THIS page's orders (compact: title + qty/period).
    const orderIds = ordersData.map((o) => o.id);
    const itemRows = orderIds.length
      ? await db
          .select({
            orderId: orderItems.orderId,
            title: services.title,
            quantity: orderItems.quantity,
            startDate: orderItems.startDate,
            endDate: orderItems.endDate,
          })
          .from(orderItems)
          .leftJoin(services, eq(orderItems.serviceId, services.id))
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemsByOrder = new Map<string, typeof itemRows>();
    for (const it of itemRows) {
      if (!it.orderId) continue;
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push(it);
      itemsByOrder.set(it.orderId, arr);
    }

    const ordersWithItems = ordersData.map((o) => ({
      ...o,
      items: (itemsByOrder.get(o.id) ?? []).map((it) => ({
        title: it.title,
        quantity: it.quantity,
        startDate: it.startDate,
        endDate: it.endDate,
      })),
    }));

    return NextResponse.json({ orders: ordersWithItems, total, page, pageSize });
  } catch (error) {
    console.error('[Admin Orders API Error]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

/**
 * Manually create a PAID order on a customer's behalf — for off-site payments
 * (user sent money directly). The total is computed entirely server-side from
 * current DB prices; the client total is never trusted.
 *
 * Side effects mirror a normal paid order: promocode usage is recorded and the
 * admin Telegram notification is sent. paymentId is marked 'MANUAL' so the
 * order is never confused with an abandoned/auto-cancelled checkout by the
 * cleanup job (which only touches cancelled orders with a null paymentId).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const userId: string | undefined = body?.userId;
    const rawItems: Array<{ serviceId: string; quantity: number }> = body?.items ?? [];
    const rawPromocode: string | undefined = body?.promocode?.trim() || undefined;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Не выбран клиент' }, { status: 400 });
    }
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'Добавьте хотя бы одну услугу' }, { status: 400 });
    }

    // Validate the customer exists, and grab their contact details for notes.
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        receiptEmail: users.receiptEmail,
        telegramUsername: users.telegramUsername,
        adventureRank: users.adventureRank,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 });
    }

    // Normalise + validate line items.
    const qtyById = new Map<string, number>();
    for (const it of rawItems) {
      const qty = Math.floor(Number(it?.quantity));
      if (!it?.serviceId || !Number.isFinite(qty) || qty < 1) {
        return NextResponse.json({ error: 'Некорректная позиция заказа' }, { status: 400 });
      }
      qtyById.set(it.serviceId, (qtyById.get(it.serviceId) ?? 0) + qty);
    }

    // Fetch the chosen services (real services only — test services excluded).
    const ids = [...qtyById.keys()];
    const dbServices = await db
      .select({
        id: services.id,
        title: services.title,
        price: services.price,
        isTestService: services.isTestService,
      })
      .from(services)
      .where(inArray(services.id, ids));

    if (dbServices.length !== ids.length || dbServices.some((s) => s.isTestService)) {
      return NextResponse.json({ error: 'Одна из услуг не найдена' }, { status: 400 });
    }

    // Compute the subtotal from current DB prices.
    let subtotal = 0;
    const itemRows = dbServices.map((s) => {
      const quantity = qtyById.get(s.id)!;
      const unit = Number(s.price);
      subtotal += unit * quantity;
      return { service: s, quantity, unit };
    });
    subtotal = round2(subtotal);

    // Apply a promocode if provided (validated against the chosen customer).
    let discountPercent = 0;
    let promocodeId: string | null = null;
    let promocodeCode: string | null = null;
    if (rawPromocode) {
      const promo = await validatePromocodeForUser(rawPromocode, userId);
      if (!promo.ok) {
        return NextResponse.json({ error: promo.error }, { status: 400 });
      }
      discountPercent = promo.discountPercent;
      promocodeId = promo.promocodeId;
      promocodeCode = promo.code;
    }

    const total = round2(subtotal * (1 - discountPercent / 100));

    const userNotes =
      `Email: ${user.receiptEmail || user.email}\n` +
      `Telegram: ${user.telegramUsername ?? '—'}\n` +
      `Adventure Rank: ${user.adventureRank ?? '—'}\n` +
      `[Создано вручную администратором]` +
      (promocodeCode ? `\nPromocode: ${promocodeCode}` : '');

    // 1. Create the paid order.
    const [created] = await db
      .insert(orders)
      .values({
        userId,
        status: 'paid',
        paymentId: 'MANUAL',
        totalPrice: total.toFixed(2),
        userNotes,
        promocode: promocodeCode,
      })
      .returning({ id: orders.id, createdAt: orders.createdAt });

    // 2. Line items (priceAtPurchase = current unit price).
    await db.insert(orderItems).values(
      itemRows.map((r) => ({
        orderId: created.id,
        serviceId: r.service.id,
        quantity: r.quantity,
        priceAtPurchase: r.unit.toFixed(2),
      }))
    );

    // 3. Record promocode usage (paid immediately).
    if (promocodeId) {
      try {
        await db.insert(promocodeUsage).values({
          promocodeId,
          userId,
          orderId: created.id,
        });
      } catch (e) {
        console.error('[Manual Order] Failed to record promocode usage:', e);
      }
    }

    // 4. Notify admin via Telegram (best effort — never fail the request).
    try {
      const { notifyAdminAboutOrder } = await import('@/lib/telegramClient');
      const itemsDescription = itemRows
        .map((r) => `- ${r.service.title} (x${r.quantity}) - ${r.unit.toFixed(2)} руб.`)
        .join('\n');
      await notifyAdminAboutOrder({
        id: created.id,
        totalAmount: total.toFixed(2),
        itemsDescription,
        userNotes,
      });
    } catch (tgError) {
      console.error('[Manual Order] Telegram notification failed:', tgError);
    }

    return NextResponse.json({ ok: true, orderId: created.id, total });
  } catch (error) {
    console.error('[Manual Order Create Error]', error);
    return NextResponse.json({ error: 'Не удалось создать заказ' }, { status: 500 });
  }
}
