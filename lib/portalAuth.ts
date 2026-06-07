import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from './db';
import { boosters } from './schema';
import { and, eq } from 'drizzle-orm';

/**
 * Server-side identity for the booster portal (/portal, /api/portal).
 *
 * The 'booster' role on the session only GATES the routes (edge middleware).
 * The actual identity is the boosters.user_id FK — every portal query must be
 * scoped through the booster row returned here. Returns null when there is no
 * session, no linked roster row, or the booster is deactivated.
 */
export type BoosterContext = {
  userId: string;
  booster: typeof boosters.$inferSelect;
};

export async function getBoosterContext(): Promise<BoosterContext | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || session.user.role !== 'booster') return null;

  const [booster] = await db
    .select()
    .from(boosters)
    .where(and(eq(boosters.userId, userId), eq(boosters.status, 'active')));

  if (!booster) return null;
  return { userId, booster };
}

/** Expected commission for an order that hasn't been credited yet. */
export function expectedCut(totalPrice: string, commissionPercent: number): number {
  return Math.round(Number(totalPrice) * commissionPercent) / 100;
}
