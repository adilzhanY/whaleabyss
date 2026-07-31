import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { cartItems, services } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { enforceRateLimit, RATE_TIERS } from '@/lib/apiRateLimit';
import { isAddonChoice } from '@/lib/addonChoice';

/** One line as the browser sends it — `id` is the service slug. */
interface IncomingCartItem {
  id: string;
  quantity?: number;
  startDate?: string;
  endDate?: string;
  addonChoice?: unknown;
}

/**
 * POST /api/cart/sync
 * Sync cart items from localStorage to database for logged-in user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId: string | null = session?.user?.id || null;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const limited = enforceRateLimit(req, 'cart:sync', RATE_TIERS.sync, userId);
    if (limited) return limited;

    const body = await req.json();

    if (!body?.items || !Array.isArray(body.items)) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }
    const items = body.items as IncomingCartItem[];

    // Resolve every slug in ONE query. This used to be a SELECT per item in a
    // loop, which made the route's latency scale with cart size — and that is
    // what turned two concurrent syncs into a lost deletion: the older, bigger
    // request finished last and re-inserted the rows the newer one had just
    // removed. See the syncInFlight note in store/useCart.ts.
    const slugToIdMap = new Map<string, string>();
    if (items.length > 0) {
      const slugs = [...new Set(items.map((item) => String(item.id)))];
      const dbServices = await db
        .select({ id: services.id, slug: services.slug })
        .from(services)
        .where(inArray(services.slug, slugs));
      for (const row of dbServices) slugToIdMap.set(row.slug, row.id);
    }

    // Replace the whole cart in one transaction, so a concurrent sync can never
    // observe (or interleave with) the half-applied state.
    await db.transaction(async (tx) => {
      await tx.delete(cartItems).where(eq(cartItems.userId, userId));

      if (items.length === 0) return;

      const insertData = items
        .map((item) => {
          const serviceId = slugToIdMap.get(item.id);
          if (!serviceId) return null;

          return {
            userId,
            serviceId,
            quantity: item.quantity || 1,
            ...(item.startDate ? { startDate: new Date(item.startDate) } : {}),
            ...(item.endDate ? { endDate: new Date(item.endDate) } : {}),
            // Quest-addon declaration ('completed' | 'self' | 'quests') — see
            // lib/addonChoice. Whitelisted; anything else is stored as NULL.
            ...(isAddonChoice(item.addonChoice)
              ? { addonChoice: item.addonChoice }
              : {}),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (insertData.length > 0) {
        // onConflictDoNothing + the unique (user_id, service_id) index guard
        // against concurrent syncs interleaving their delete+insert cycles
        // and duplicating rows (caused duplicate React keys in the cart).
        await tx.insert(cartItems).values(insertData).onConflictDoNothing();
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cart Sync Error]', error);
    return NextResponse.json({ error: 'Failed to sync cart' }, { status: 500 });
  }
}
