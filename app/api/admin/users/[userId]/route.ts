import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import {
  users,
  orders,
  orderItems,
  services,
  reviews,
  cartItems,
  oauthAccounts,
  promocodeUsage,
  promocodes,
  boosters,
} from '@/lib/schema';
import { eq, inArray, desc } from 'drizzle-orm';

/** Orders that represent real money: everything except abandoned/cancelled ones. */
const REVENUE_STATUSES = new Set(['paid', 'in_progress', 'completed', 'refunded']);
const DAY_MS = 86_400_000;

/** `YYYY-MM` key used to bucket spend for the sparkline. */
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Everything below is independent of everything else — one round trip.
    const [userOrders, userReviews, providerRows, cartRows, promoRows, boosterRow] =
      await Promise.all([
        db
          .select({
            id: orders.id,
            status: orders.status,
            totalPrice: orders.totalPrice,
            paymentId: orders.paymentId,
            userNotes: orders.userNotes,
            promocode: orders.promocode,
            createdAt: orders.createdAt,
            updatedAt: orders.updatedAt,
            boosterId: orders.boosterId,
            boosterFirstName: boosters.firstName,
            boosterLastName: boosters.lastName,
          })
          .from(orders)
          .leftJoin(boosters, eq(orders.boosterId, boosters.id))
          .where(eq(orders.userId, userId))
          .orderBy(desc(orders.createdAt)),

        db
          .select()
          .from(reviews)
          .where(eq(reviews.userId, userId))
          .orderBy(desc(reviews.createdAt)),

        // Login methods: OAuth links + whether a password exists at all.
        db
          .select({ provider: oauthAccounts.provider })
          .from(oauthAccounts)
          .where(eq(oauthAccounts.userId, userId)),

        // The live cart — for most users the only signal there is.
        db
          .select({
            id: cartItems.id,
            serviceId: cartItems.serviceId,
            title: services.title,
            slug: services.slug,
            price: services.price,
            quantity: cartItems.quantity,
            startDate: cartItems.startDate,
            endDate: cartItems.endDate,
            addonChoice: cartItems.addonChoice,
            createdAt: cartItems.createdAt,
          })
          .from(cartItems)
          .leftJoin(services, eq(cartItems.serviceId, services.id))
          .where(eq(cartItems.userId, userId))
          .orderBy(desc(cartItems.createdAt)),

        db
          .select({
            id: promocodeUsage.id,
            code: promocodes.code,
            discountPercent: promocodes.discountPercent,
            usedAt: promocodeUsage.usedAt,
            orderId: promocodeUsage.orderId,
          })
          .from(promocodeUsage)
          .leftJoin(promocodes, eq(promocodeUsage.promocodeId, promocodes.id))
          .where(eq(promocodeUsage.userId, userId))
          .orderBy(desc(promocodeUsage.usedAt)),

        // Linked booster roster row (if this account has portal access). Used
        // to refuse a role change that would silently break /portal.
        db
          .select({ id: boosters.id })
          .from(boosters)
          .where(eq(boosters.userId, userId))
          .limit(1),
      ]);

    const revenueOrders = userOrders.filter((o) => REVENUE_STATUSES.has(o.status ?? ''));
    const revenueOrderIds = revenueOrders.map((o) => o.id);
    const allOrderIds = userOrders.map((o) => o.id);

    // Line items for EVERY order (not just revenue ones) so the table can show
    // what was in an order without opening it. Top-3 still counts only revenue.
    const items = allOrderIds.length
      ? await db
          .select({
            orderId: orderItems.orderId,
            serviceId: orderItems.serviceId,
            title: services.title,
            quantity: orderItems.quantity,
            priceAtPurchase: orderItems.priceAtPurchase,
            startDate: orderItems.startDate,
            endDate: orderItems.endDate,
            addonChoice: orderItems.addonChoice,
          })
          .from(orderItems)
          .leftJoin(services, eq(orderItems.serviceId, services.id))
          .where(inArray(orderItems.orderId, allOrderIds))
      : [];

    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      if (!item.orderId) continue;
      const list = itemsByOrder.get(item.orderId);
      if (list) list.push(item);
      else itemsByOrder.set(item.orderId, [item]);
    }

    // Top-3 services by purchased quantity, revenue orders only.
    const serviceCounts = new Map<string, { title: string; count: number }>();
    for (const item of items) {
      if (!item.serviceId || !item.title || !item.orderId) continue;
      if (!revenueOrderIds.includes(item.orderId)) continue;
      const quantity = item.quantity || 1;
      const existing = serviceCounts.get(item.serviceId);
      if (existing) existing.count += quantity;
      else serviceCounts.set(item.serviceId, { title: item.title, count: quantity });
    }
    const topServices = Array.from(serviceCounts.entries())
      .map(([serviceId, data]) => ({ serviceId, title: data.title, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const orderTotals = revenueOrders.map((o) => Number(o.totalPrice));
    const totalSpent = orderTotals.reduce((sum, n) => sum + n, 0);
    const orderDates = userOrders
      .map((o) => (o.createdAt ? new Date(o.createdAt).getTime() : null))
      .filter((t): t is number => t != null);
    const lastOrderAt = orderDates.length ? Math.max(...orderDates) : null;

    // Spend per month for the last 6 months, oldest first (sparkline input).
    const now = new Date();
    const months: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: monthKey(d), total: 0 });
    }
    for (const order of revenueOrders) {
      if (!order.createdAt) continue;
      const bucket = months.find((m) => m.month === monthKey(new Date(order.createdAt!)));
      if (bucket) bucket.total += Number(order.totalPrice);
    }

    const statusCounts: Record<string, number> = {};
    for (const order of userOrders) {
      const key = order.status ?? 'pending';
      statusCounts[key] = (statusCounts[key] ?? 0) + 1;
    }

    const ratings = userReviews.map((r) => Number(r.rating)).filter((n) => !Number.isNaN(n));

    const cart = cartRows.map((row) => {
      const price = Number(row.price ?? 0);
      return {
        id: row.id,
        serviceId: row.serviceId,
        title: row.title,
        slug: row.slug,
        price,
        quantity: row.quantity,
        lineTotal: price * (row.quantity || 1),
        startDate: row.startDate,
        endDate: row.endDate,
        addonChoice: row.addonChoice,
        createdAt: row.createdAt,
      };
    });
    const cartDates = cart
      .map((c) => (c.createdAt ? new Date(c.createdAt).getTime() : null))
      .filter((t): t is number => t != null);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        telegramUsername: user.telegramUsername,
        gameUsername: user.gameUsername, // legacy — kept for old customers
        adventureRank: user.adventureRank,
        receiptEmail: user.receiptEmail,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Login methods: an OAuth-created account has no password hash at all,
        // which is the answer to most "не могу войти" tickets.
        hasPassword: user.passwordHash != null,
        authProviders: providerRows.map((p) => p.provider),
        // Portal access. Only used to block a role change that would break it.
        linkedBoosterId: boosterRow[0]?.id ?? null,
      },
      orders: userOrders.map((o) => ({
        id: o.id,
        status: o.status,
        totalPrice: o.totalPrice,
        paymentId: o.paymentId,
        userNotes: o.userNotes,
        promocode: o.promocode,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        boosterId: o.boosterId,
        boosterName: o.boosterFirstName
          ? `${o.boosterFirstName} ${o.boosterLastName ?? ''}`.trim()
          : null,
        items: (itemsByOrder.get(o.id) ?? []).map((item) => ({
          title: item.title,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          startDate: item.startDate,
          endDate: item.endDate,
          addonChoice: item.addonChoice,
        })),
      })),
      reviews: userReviews,
      cart,
      cartTotal: cart.reduce((sum, c) => sum + c.lineTotal, 0),
      cartUpdatedAt: cartDates.length ? new Date(Math.max(...cartDates)).toISOString() : null,
      promocodeUses: promoRows,
      stats: {
        totalSpent,
        totalOrders: userOrders.length,
        paidOrders: revenueOrders.length,
        totalReviews: userReviews.length,
        avgOrder: orderTotals.length ? Math.round(totalSpent / orderTotals.length) : 0,
        maxOrder: orderTotals.length ? Math.max(...orderTotals) : 0,
        firstOrderAt: orderDates.length ? new Date(Math.min(...orderDates)).toISOString() : null,
        lastOrderAt: lastOrderAt ? new Date(lastOrderAt).toISOString() : null,
        daysSinceLastOrder:
          lastOrderAt != null ? Math.floor((Date.now() - lastOrderAt) / DAY_MS) : null,
        // Computed here, not in the component: `Date.now()` in a render body is
        // impure (react-hooks/purity) and would drift between server and client.
        daysSinceRegistration: user.createdAt
          ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / DAY_MS)
          : 0,
        avgRating: ratings.length
          ? Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10
          : null,
        statusCounts,
      },
      monthlySpend: months,
      topServices,
    });
  } catch (error) {
    console.error('Failed to fetch user details:', error);
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}

/**
 * Role change from the user card. Deliberately narrow:
 * - only `user` ⇄ `admin`. The `booster` role is granted on /admin/booster/[id]
 *   in one transaction with `boosters.userId`; setting it here would produce a
 *   booster-role account with no roster row, which `getBoosterContext()` rejects.
 * - an admin can't change their own role (no way to lock yourself out).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: 'Нельзя менять роль собственного аккаунта' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const role = body?.role;
    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Доступны только роли «user» и «admin». Доступ бустера выдаётся на странице качера.' },
        { status: 400 }
      );
    }

    const [target] = await db.select().from(users).where(eq(users.id, userId));
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Demoting a linked booster would leave the roster row pointing at an
    // account that can no longer open /portal — unlink it there instead.
    const [linkedBooster] = await db
      .select({ id: boosters.id })
      .from(boosters)
      .where(eq(boosters.userId, userId))
      .limit(1);
    if (linkedBooster) {
      return NextResponse.json(
        { error: 'Аккаунт привязан к качеру. Сначала отвяжите его на странице бустера.' },
        { status: 409 }
      );
    }

    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error('Failed to update user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
