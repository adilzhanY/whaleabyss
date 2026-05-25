import { db } from '@/lib/db';
import { promocodes, promocodeUsage } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

export type PromoResult =
  | { ok: true; code: string; discountPercent: number; promocodeId: string }
  | { ok: false; error: string };

/**
 * Validates a promocode against a specific user: existence, expiry, and the
 * per-user single-use rule (via promocode_usage). Shared by the public
 * validation route logic and the admin manual-order flow, where the code is
 * checked against the *chosen* customer rather than the session user.
 */
export async function validatePromocodeForUser(
  rawCode: string,
  userId: string
): Promise<PromoResult> {
  const code = rawCode.toUpperCase().trim();
  if (!code) return { ok: false, error: 'Промокод не указан' };

  const [promo] = await db
    .select()
    .from(promocodes)
    .where(eq(promocodes.code, code))
    .limit(1);

  if (!promo) return { ok: false, error: 'Промокод не найден' };

  if (new Date() > new Date(promo.expiresAt)) {
    return { ok: false, error: 'Промокод истёк' };
  }

  const [usage] = await db
    .select({ id: promocodeUsage.id })
    .from(promocodeUsage)
    .where(
      and(
        eq(promocodeUsage.promocodeId, promo.id),
        eq(promocodeUsage.userId, userId)
      )
    )
    .limit(1);

  if (usage) {
    return { ok: false, error: 'Клиент уже использовал этот промокод' };
  }

  return {
    ok: true,
    code: promo.code,
    discountPercent: promo.discountPercent,
    promocodeId: promo.id,
  };
}
