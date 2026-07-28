import { NextRequest, NextResponse } from 'next/server';
import { getAllServices, getServiceCategories, type ServiceItem } from '@/lib/services';
import { getRecommendedServices } from '@/lib/recommendations';
import { parseMinAdventureRank } from '@/lib/adventureRank';
import { enforceRateLimit, RATE_TIERS } from '@/lib/apiRateLimit';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/cart/meta?slugs=a,b,c
 *
 * Display-only enrichment for /cart. The cart store persists just what the
 * "add" button knew (title, price, image), so the cart page can't show the
 * category, the Adventure Rank requirement, or whether a line is quest-gated
 * without asking the server.
 *
 * **This is informational, never a gate.** Every invariant it surfaces early
 * is still enforced server-side at /api/checkout (422 for rank, 409 for a
 * missing quest declaration). If this route fails, the cart simply renders
 * without chips and warnings — it must never become the thing that decides
 * whether an order is allowed, and it must never be treated as sufficient.
 *
 * With no `slugs` (empty cart) it answers with «Актуальное» services so the
 * empty state has somewhere to send the visitor.
 */

/** Cart lines are a handful in practice; cap the fan-out anyway. */
const MAX_SLUGS = 40;
const REC_COUNT = 3;
const EMPTY_CART_COUNT = 4;

interface CartLineMeta {
  title: string;
  subtitle: string;
  categoryTitle: string | null;
  /** Minimum Adventure Rank parsed from the description, or null. */
  minAdventureRank: number | null;
  hasQuestAddons: boolean;
  isPerDay: boolean;
  /** Current catalogue price — the cart line may hold a stale one. */
  price: number;
}

/** Shape the cart's recommendation strip renders (mirrors an add-to-cart item). */
function toCard(s: ServiceItem) {
  return {
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    price: s.price,
    image: s.background || '',
    hasQuestAddons: Boolean(s.hasQuestAddons),
    minAdventureRank: parseMinAdventureRank(s.description),
  };
}

export async function GET(req: NextRequest) {
  try {
    // Keyed by user when signed in, so a shared carrier NAT can't make one
    // shopper's cart edits eat everyone else's budget (same rule as /addons).
    const session = await getServerSession(authOptions);
    const userId: string | null = session?.user?.id ?? null;
    const limited = enforceRateLimit(req, 'cart-meta', RATE_TIERS.read, userId);
    if (limited) return limited;

    const raw = req.nextUrl.searchParams.get('slugs') || '';
    const slugs = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_SLUGS);

    const all = await getAllServices();
    const bySlug = new Map(all.map((s) => [s.id, s]));

    const items: Record<string, CartLineMeta> = {};
    for (const slug of slugs) {
      const s = bySlug.get(slug);
      if (!s) continue; // unknown/test service — checkout rejects it anyway
      items[slug] = {
        title: s.title,
        subtitle: s.subtitle,
        categoryTitle: s.categoryTitle ?? null,
        minAdventureRank: parseMinAdventureRank(s.description),
        hasQuestAddons: Boolean(s.hasQuestAddons),
        isPerDay: Boolean(s.isPerDay),
        price: s.price,
      };
    }

    const inCart = new Set(slugs);
    const recommendations: ReturnType<typeof toCard>[] = [];
    const push = (s: ServiceItem | undefined) => {
      if (!s || inCart.has(s.id)) return;
      if (recommendations.some((r) => r.id === s.id)) return;
      recommendations.push(toCard(s));
    };

    if (slugs.length === 0) {
      // Empty cart: «Актуальное» is the site's own spotlight list, so the empty
      // state promotes something real instead of an invented "popular". It can
      // hold fewer than EMPTY_CART_COUNT services (today it holds one), so top
      // the row up from the catalogue rather than leaving blank grid cells.
      const cats = await getServiceCategories();
      const actual = cats.find((c) => c.slug === 'actual');
      for (const s of (actual?.items ?? []).slice(0, EMPTY_CART_COUNT)) push(s);
      for (const s of all) {
        if (recommendations.length >= EMPTY_CART_COUNT) break;
        push(s);
      }
    } else {
      // Seed from the most expensive line — the strongest signal of what this
      // customer is actually buying — then top up from the remaining lines.
      const seeds = [...slugs]
        .filter((s) => bySlug.has(s))
        .sort((a, b) => (bySlug.get(b)!.price ?? 0) - (bySlug.get(a)!.price ?? 0));

      for (const seed of seeds) {
        if (recommendations.length >= REC_COUNT) break;
        for (const rec of await getRecommendedServices(seed)) {
          if (recommendations.length >= REC_COUNT) break;
          push(rec);
        }
      }
    }

    return NextResponse.json({
      items,
      recommendations: recommendations.slice(0, slugs.length === 0 ? EMPTY_CART_COUNT : REC_COUNT),
    });
  } catch (error) {
    // No `items` key on failure. A success-shaped error body is exactly what
    // let a transient blip masquerade as a definitive answer in the addons
    // incident (see CLAUDE.md → Quest Addon Upsell).
    console.error('[Cart Meta Error]', error);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
