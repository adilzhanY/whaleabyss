import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { services, serviceAddons } from '@/lib/schema';
import { eq, and, asc } from 'drizzle-orm';
import { enforceRateLimit, RATE_TIERS } from '@/lib/apiRateLimit';

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
    const limited = enforceRateLimit(req, 'addons', RATE_TIERS.read);
    if (limited) return limited;

    const { slug } = await params;

    const parent = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.slug, slug), eq(services.isTestService, false)))
      .limit(1);

    if (parent.length === 0) {
      return NextResponse.json({ addons: [] });
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
    console.error('[Service Addons Error]', error);
    return NextResponse.json({ addons: [] }, { status: 500 });
  }
}
