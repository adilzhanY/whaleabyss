import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { boosters, users } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAdminApi } from '@/lib/auth/requireAdmin';

/**
 * Link / unlink a site account to a booster for /portal access.
 *
 * POST   { email } — finds the user by email, sets users.role='booster' and
 *                    boosters.userId in one transaction.
 * DELETE           — unlinks: boosters.userId=NULL, users.role back to 'user'.
 *
 * Invariants kept by both directions: the FK and the role always change
 * together, so no orphaned booster-role accounts linger.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    return NextResponse.json({ error: 'Укажите email аккаунта' }, { status: 400 });
  }

  const [booster] = await db.select().from(boosters).where(eq(boosters.id, id));
  if (!booster) {
    return NextResponse.json({ error: 'Качер не найден' }, { status: 404 });
  }
  if (booster.userId) {
    return NextResponse.json(
      { error: 'У качера уже привязан аккаунт. Сначала отвяжите текущий.' },
      { status: 409 }
    );
  }

  const [user] = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`);
  if (!user) {
    return NextResponse.json({ error: 'Пользователь с таким email не найден' }, { status: 404 });
  }
  if (user.role === 'admin') {
    return NextResponse.json({ error: 'Нельзя привязать аккаунт администратора' }, { status: 400 });
  }

  const [linkedElsewhere] = await db
    .select({ id: boosters.id })
    .from(boosters)
    .where(eq(boosters.userId, user.id));
  if (linkedElsewhere) {
    return NextResponse.json(
      { error: 'Этот аккаунт уже привязан к другому качеру' },
      { status: 409 }
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(boosters)
      .set({ userId: user.id, updatedAt: new Date() })
      .where(eq(boosters.id, id));
    await tx
      .update(users)
      .set({ role: 'booster', updatedAt: new Date() })
      .where(eq(users.id, user.id));
  });

  return NextResponse.json({ success: true, email: user.email });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;
  const [booster] = await db
    .select({ userId: boosters.userId })
    .from(boosters)
    .where(eq(boosters.id, id));
  if (!booster) {
    return NextResponse.json({ error: 'Качер не найден' }, { status: 404 });
  }
  if (!booster.userId) {
    return NextResponse.json({ error: 'Аккаунт не привязан' }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(boosters)
      .set({ userId: null, updatedAt: new Date() })
      .where(eq(boosters.id, id));
    await tx
      .update(users)
      .set({ role: 'user', updatedAt: new Date() })
      .where(eq(users.id, booster.userId!));
  });

  return NextResponse.json({ success: true });
}
