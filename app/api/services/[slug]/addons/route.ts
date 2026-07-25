import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { services, serviceAddons } from '@/lib/schema';
import { eq, and, asc } from 'drizzle-orm';
import { enforceRateLimit, RATE_TIERS } from '@/lib/apiRateLimit';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/services/[slug]/addons
 * Public: quest addon services offered when the parent (exploration) service
 * is added to the cart. Empty list → the add-to-cart flow skips the modal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Keyed by user when signed in — a shared mobile-carrier NAT must not make
    // one shopper's clicks eat everyone else's budget on a revenue path.
    const session = await getServerSession(authOptions);
    const userId: string | null = session?.user?.id ?? null;
    const limited = enforceRateLimit(req, 'addons', RATE_TIERS.read, userId);
    if (limited) return limited;

    const { slug } = await params;

    const parent = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.slug, slug), eq(services.isTestService, false)))
      .limit(1);

    // 404, not an empty 200. "I couldn't resolve this service" and "this
    // service genuinely has no quests" are different answers, and returning the
    // success shape for both is what let a lookup failure masquerade as a
    // definitive "no addons" and skip the mandatory modal.
    if (parent.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const rows = await db
      .select({
        slug: services.slug,
        title: services.title,
        subtitle: services.subtitle,
        price: services.price,
        imageUrl: services.imageUrl,
        sortOrder: serviceAddons.sortOrder,
      })
      .from(serviceAddons)
      .innerJoin(services, eq(serviceAddons.addonServiceId, services.id))
      .where(
        and(
          eq(serviceAddons.parentServiceId, parent[0].id),
          eq(services.isTestService, false)
        )
      )
      .orderBy(asc(serviceAddons.sortOrder));

    const addons = rows.map((r) => ({
      id: r.slug,
      title: r.title,
      subtitle: r.subtitle || r.title,
      price: parseFloat(r.price),
      image: r.imageUrl || '',
    }));

    return NextResponse.json({ addons });
  } catch (error) {
    // Never return an `addons` key on failure — a body that looks like success
    // is one refactor away from being read as "no addons for this service".
    console.error('[Service Addons Error]', error);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
