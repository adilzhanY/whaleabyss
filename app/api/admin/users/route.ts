import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { and, asc, desc, ilike, or, sql, type SQL } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const VALID_ROLES = new Set(['user', 'admin', 'booster']);

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
    const search = (sp.get('search') || '').trim();

    const conditions: SQL[] = [];
    if (role !== 'all' && VALID_ROLES.has(role)) {
      conditions.push(sql`${users.role}::text = ${role}`);
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
