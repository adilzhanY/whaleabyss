import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, orders } from '@/lib/schema';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { notTestOrder } from '@/lib/testOrders';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const VALID_ROLES = new Set(['user', 'admin', 'booster']);

/**
 * Orders that count as money spent — everything except abandoned checkouts
 * (`pending`) and cancellations. Refunds ARE included, which is what
 * `/admin/users/[userId]` has always summed, so the list and the card can
 * never show two different «Потрачено» for the same person.
 */
const SPENT_STATUSES = ['paid', 'in_progress', 'completed', 'refunded'] as const;

/**
 * Per-user aggregate as a correlated subquery: it runs for the ten rows of the
 * current page only and leaves the count query and every filter above untouched.
 *
 * Built with the query builder rather than a hand-written `sql` fragment on
 * purpose — inside a raw fragment Drizzle emits column names UNQUALIFIED, so
 * `${orders.userId} = ${users.id}` came out as `"user_id" = "id"`, both of
 * which bind to `orders` inside the subquery. It silently returned 0 for
 * everyone. The builder form emits `"orders"."user_id" = "users"."id"`.
 */
function spentAggregate(value: SQL) {
  return db
    .select({ value })
    .from(orders)
    .where(and(eq(orders.userId, users.id), inArray(orders.status, SPENT_STATUSES), notTestOrder));
}

export async function GET(req: NextRequest) {
  try {
    // Defense in depth on top of the edge middleware (admin PII lives here).
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Server-side pagination + filtering. Mirrors exactly what the client
    // used to do in-memory, so the whole users table is never shipped at once. ---
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '10', 10) || 10));
    const sort = sp.get('sort') === 'oldest' ? 'oldest' : 'newest';
    const role = sp.get('role') || 'all';
    const startDate = sp.get('startDate') || '';
    const endDate = sp.get('endDate') || '';
    const search = (sp.get('search') || '').trim();

    const conditions: SQL[] = [];
    if (role !== 'all' && VALID_ROLES.has(role)) {
      conditions.push(sql`${users.role}::text = ${role}`);
    }
    // Registration-date range (mirrors the orders API: end day inclusive).
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) conditions.push(gte(users.createdAt, start));
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(users.createdAt, end));
      }
    }
    if (search) {
      const like = `%${search}%`;
      conditions.push(
        or(
          sql`${users.id}::text ILIKE ${like}`,
          ilike(users.username, like),
          ilike(users.email, like),
          ilike(users.telegramUsername, like),
        )!,
      );
    }
    const whereExpr = conditions.length ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereExpr);
    const total = countRow?.count ?? 0;

    const pageUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        telegramUsername: users.telegramUsername,
        adventureRank: users.adventureRank,
        createdAt: users.createdAt,
        orderCount: sql<number>`(${spentAggregate(sql`count(*)::int`)})`,
        totalSpent: sql<string>`(${spentAggregate(
          sql`coalesce(sum(${orders.totalPrice}), 0)::text`
        )})`,
      })
      .from(users)
      .where(whereExpr)
      .orderBy(sort === 'oldest' ? asc(users.createdAt) : desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({ users: pageUsers, total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
