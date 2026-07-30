import { cache } from 'react';
import { and, desc, eq, inArray, isNotNull, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  oauthAccounts,
  orderItems,
  orders,
  promocodeUsage,
  promocodes,
  reviews,
  services,
  users,
} from '@/lib/schema';

/**
 * Everything the /profile page shows, in one server-side read.
 *
 * The page used to render only the session (name, email, avatar) and fetch the
 * rest from the client, which is why it looked empty on arrival. All of this
 * data already existed in the DB — it just had no surface.
 *
 * Every figure here is queried live. If a section's query is empty the page
 * renders an explicit empty state rather than hiding the section, so a new
 * customer still sees the shape of their account.
 */

/** Statuses a customer would call "идёт прямо сейчас". */
const ACTIVE_STATUSES = ['paid', 'in_progress'] as const;

export interface ProfileOrderItem {
  serviceId: string | null;
  serviceSlug: string | null;
  serviceTitle: string;
  serviceImage: string | null;
  quantity: number;
}

export interface ProfileOrder {
  id: string;
  status: string;
  /** Decimal-as-string, like everywhere else in the schema. */
  totalPrice: string;
  boosterOnline: boolean;
  createdAt: string | null;
  items: ProfileOrderItem[];
}

export interface ProfileReview {
  id: string;
  rating: string;
  description: string;
  status: string;
  createdAt: string | null;
}

export interface ProfilePromocodeUse {
  id: string;
  code: string;
  discountPercent: number;
  usedAt: string | null;
  /** Roubles saved on that order, or null when it can't be derived. */
  saved: number | null;
}

export interface ProfileOverview {
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    telegramUsername: string | null;
    adventureRank: number | null;
    receiptEmail: string | null;
    role: string | null;
    createdAt: string | null;
    /** False for Yandex-created accounts that never set one. */
    hasPassword: boolean;
  };
  /** Linked OAuth providers, e.g. ['yandex']. */
  providers: string[];
  stats: {
    completedOrders: number;
    activeOrders: number;
    reviewCount: number;
  };
  /** Most recent order currently in work — drives the live tracker. */
  activeBoost: ProfileOrder | null;
  recentOrders: ProfileOrder[];
  reviews: ProfileReview[];
  promocodes: ProfilePromocodeUse[];
}

/**
 * Abandoned checkouts (auto-cancelled with no payment) are noise, not history —
 * the same rule the /orders list and its API already apply.
 */
const visibleOrder = or(ne(orders.status, 'cancelled'), isNotNull(orders.paymentId));

/** One query for the line items of every order on the page (no N+1). */
async function loadItems(orderIds: string[]): Promise<Map<string, ProfileOrderItem[]>> {
  const grouped = new Map<string, ProfileOrderItem[]>();
  if (orderIds.length === 0) return grouped;

  const rows = await db
    .select({
      orderId: orderItems.orderId,
      quantity: orderItems.quantity,
      serviceId: services.id,
      serviceSlug: services.slug,
      serviceTitle: services.title,
      serviceImage: services.imageUrl,
    })
    .from(orderItems)
    .leftJoin(services, eq(orderItems.serviceId, services.id))
    .where(inArray(orderItems.orderId, orderIds));

  for (const row of rows) {
    if (!row.orderId) continue;
    const list = grouped.get(row.orderId) ?? [];
    list.push({
      serviceId: row.serviceId ?? null,
      serviceSlug: row.serviceSlug ?? null,
      serviceTitle: row.serviceTitle ?? 'Неизвестная услуга',
      serviceImage: row.serviceImage ?? null,
      quantity: row.quantity ?? 1,
    });
    grouped.set(row.orderId, list);
  }

  return grouped;
}

export const getProfileOverview = cache(
  async (userId: string): Promise<ProfileOverview | null> => {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        avatarUrl: users.avatarUrl,
        telegramUsername: users.telegramUsername,
        adventureRank: users.adventureRank,
        receiptEmail: users.receiptEmail,
        role: users.role,
        createdAt: users.createdAt,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return null;

    const [providerRows, statRow, orderRows, reviewRows, reviewCount, promoRows] = await Promise.all([
      db
        .select({ provider: oauthAccounts.provider })
        .from(oauthAccounts)
        .where(eq(oauthAccounts.userId, userId)),

      db
        .select({
          completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')::int`,
          active: sql<number>`count(*) filter (where ${orders.status} in ('paid','in_progress'))::int`,
        })
        .from(orders)
        .where(and(eq(orders.userId, userId), visibleOrder))
        .then((rows) => rows[0]),

      // One page of history; the tracker picks its order out of the same rows
      // when it's recent, and falls back to a targeted query when it isn't.
      db
        .select({
          id: orders.id,
          status: orders.status,
          totalPrice: orders.totalPrice,
          boosterOnline: orders.boosterOnline,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(and(eq(orders.userId, userId), visibleOrder))
        .orderBy(desc(orders.createdAt))
        .limit(3),

      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          description: reviews.description,
          status: reviews.status,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .where(eq(reviews.userId, userId))
        .orderBy(desc(reviews.createdAt))
        .limit(5),

      // The list above is capped, so the badge number needs its own count.
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(reviews)
        .where(eq(reviews.userId, userId))
        .then((rows) => rows[0]?.n ?? 0),

      db
        .select({
          id: promocodeUsage.id,
          code: promocodes.code,
          discountPercent: promocodes.discountPercent,
          usedAt: promocodeUsage.usedAt,
          totalPrice: orders.totalPrice,
          // Pre-discount value of the order — the same Σ(price × qty) the
          // booster payout uses. Saved = that minus what was actually charged.
          itemsSum: sql<string | null>`(
            select sum(${orderItems.priceAtPurchase} * ${orderItems.quantity})
            from ${orderItems}
            where ${orderItems.orderId} = ${orders.id}
          )`,
        })
        .from(promocodeUsage)
        .innerJoin(promocodes, eq(promocodes.id, promocodeUsage.promocodeId))
        .leftJoin(orders, eq(orders.id, promocodeUsage.orderId))
        .where(eq(promocodeUsage.userId, userId))
        .orderBy(desc(promocodeUsage.usedAt))
        .limit(8),
    ]);

    // The order in work may be older than the three most recent ones.
    let activeRow = orderRows.find((o) => o.status === 'in_progress') ?? null;
    if (!activeRow) {
      const [older] = await db
        .select({
          id: orders.id,
          status: orders.status,
          totalPrice: orders.totalPrice,
          boosterOnline: orders.boosterOnline,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.status, 'in_progress')))
        .orderBy(desc(orders.createdAt))
        .limit(1);
      activeRow = older ?? null;
    }

    const ids = [...new Set([...orderRows.map((o) => o.id), ...(activeRow ? [activeRow.id] : [])])];
    const items = await loadItems(ids);

    const toOrder = (row: typeof orderRows[number]): ProfileOrder => ({
      id: row.id,
      status: row.status ?? 'pending',
      totalPrice: row.totalPrice,
      boosterOnline: row.boosterOnline,
      createdAt: row.createdAt?.toISOString() ?? null,
      items: items.get(row.id) ?? [],
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        telegramUsername: user.telegramUsername,
        adventureRank: user.adventureRank,
        receiptEmail: user.receiptEmail,
        role: user.role,
        createdAt: user.createdAt?.toISOString() ?? null,
        hasPassword: Boolean(user.passwordHash),
      },
      providers: providerRows.map((r) => r.provider),
      stats: {
        completedOrders: statRow?.completed ?? 0,
        activeOrders: statRow?.active ?? 0,
        reviewCount,
      },
      activeBoost: activeRow ? toOrder(activeRow) : null,
      recentOrders: orderRows.map(toOrder),
      reviews: reviewRows.map((r) => ({
        id: r.id,
        rating: r.rating,
        description: r.description,
        status: r.status ?? 'pending',
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
      promocodes: promoRows.map((r) => {
        const gross = r.itemsSum != null ? Number(r.itemsSum) : null;
        const paid = r.totalPrice != null ? Number(r.totalPrice) : null;
        const saved =
          gross != null && paid != null && Number.isFinite(gross) && Number.isFinite(paid)
            ? Math.max(0, Math.round(gross - paid))
            : null;
        return {
          id: r.id,
          code: r.code,
          discountPercent: r.discountPercent,
          usedAt: r.usedAt?.toISOString() ?? null,
          saved,
        };
      }),
    };
  },
);

export { ACTIVE_STATUSES };
