import Link from "next/link";
import { db } from "@/lib/db";
import { orders, orderItems, services, users, boosters } from "@/lib/schema";
import { desc, eq, sql, and, or, gte, lt, inArray, isNotNull } from "drizzle-orm";
import {
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Clock,
  Users as UsersIcon,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import RecentOrdersTable from "./_components/RecentOrdersTable";
import type { OrderRow } from "./_components/orderColumns";
import TimeRangeSelect from "./_components/TimeRangeSelect";
import { TIME_RANGE_OPTIONS, type TimeRange } from "./_components/timeRange";
import {
  RevenueAreaChart,
  OrdersBarChart,
  ClientsLineChart,
  TopServicesChart,
  OrderStatusDonut,
  type SeriesPoint,
  type TimeUnit,
} from "./_components/DashboardCharts";

export const dynamic = "force-dynamic";

const RANGE_VALUES = TIME_RANGE_OPTIONS.map((o) => o.value) as readonly TimeRange[];

const RANGE_SUFFIX: Record<TimeRange, string> = {
  "1d": "за 1 день",
  "3d": "за 3 дня",
  "7d": "за 7 дней",
  "1m": "за месяц",
  "6m": "за полгода",
  "1y": "за год",
  all: "за всё время",
};

/** Chart bucket granularity per range — keeps point counts readable. */
const RANGE_UNIT: Record<TimeRange, TimeUnit> = {
  "1d": "hour",
  "3d": "day",
  "7d": "day",
  "1m": "day",
  "6m": "week",
  "1y": "month",
  all: "month",
};

const SUCCESSFUL_STATUSES = ["paid", "in_progress", "completed", "refunded"] as const;

function parseRange(raw: string | string[] | undefined): TimeRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return RANGE_VALUES.includes(value as TimeRange) ? (value as TimeRange) : "all";
}

function rangeCutoff(range: TimeRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  switch (range) {
    case "1d": d.setDate(d.getDate() - 1); break;
    case "3d": d.setDate(d.getDate() - 3); break;
    case "7d": d.setDate(d.getDate() - 7); break;
    case "1m": d.setMonth(d.getMonth() - 1); break;
    case "6m": d.setMonth(d.getMonth() - 6); break;
    case "1y": d.setFullYear(d.getFullYear() - 1); break;
  }
  return d;
}

async function getStats(cutoff: Date | null) {
  const orderWhere = cutoff
    ? and(gte(orders.createdAt, cutoff), inArray(orders.status, SUCCESSFUL_STATUSES))
    : inArray(orders.status, SUCCESSFUL_STATUSES);

  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(case when ${orders.status} = 'refunded' then 0 else ${orders.totalPrice} end), 0)::text`,
    })
    .from(orders)
    .where(orderWhere);

  // Awaiting-fulfilment is a current-state count; not affected by the range.
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(inArray(orders.status, ["paid", "in_progress"]));

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(cutoff ? gte(users.createdAt, cutoff) : sql`true`);

  return {
    orderCount: orderStats?.count ?? 0,
    revenue: Number(orderStats?.revenue ?? 0),
    awaitingFulfilment: pending?.count ?? 0,
    userCount: userCount?.count ?? 0,
  };
}

/**
 * Same headline stats for the window of equal length immediately before the
 * cutoff — powers the «+12% к пред. периоду» delta badges. Null for "all"
 * (there is no previous period).
 */
async function getPrevStats(cutoff: Date | null) {
  if (!cutoff) return null;
  const windowMs = Date.now() - cutoff.getTime();
  const prevStart = new Date(cutoff.getTime() - windowMs);

  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(case when ${orders.status} = 'refunded' then 0 else ${orders.totalPrice} end), 0)::text`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, prevStart),
        lt(orders.createdAt, cutoff),
        inArray(orders.status, SUCCESSFUL_STATUSES)
      )
    );

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(gte(users.createdAt, prevStart), lt(users.createdAt, cutoff)));

  return {
    orderCount: orderStats?.count ?? 0,
    revenue: Number(orderStats?.revenue ?? 0),
    userCount: userCount?.count ?? 0,
  };
}

/** Percent change vs the previous period; null when there's no baseline. */
function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// ── Time series for the charts ───────────────────────────────────────────────

/** UTC-truncate to the bucket start — must mirror Postgres date_trunc (UTC session). */
function truncUTC(date: Date, unit: TimeUnit): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  if (unit === "hour") return d;
  d.setUTCHours(0);
  if (unit === "day") return d;
  if (unit === "week") {
    // ISO week: Monday start, same as date_trunc('week').
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d;
  }
  d.setUTCDate(1);
  return d;
}

function addUnit(date: Date, unit: TimeUnit): Date {
  const d = new Date(date);
  switch (unit) {
    case "hour": d.setUTCHours(d.getUTCHours() + 1); break;
    case "day": d.setUTCDate(d.getUTCDate() + 1); break;
    case "week": d.setUTCDate(d.getUTCDate() + 7); break;
    case "month": d.setUTCMonth(d.getUTCMonth() + 1); break;
  }
  return d;
}

/**
 * Revenue + orders + new clients bucketed by `unit`. Gaps are zero-filled in
 * JS so the charts show a continuous timeline, not just days with activity.
 */
async function getTimeSeries(cutoff: Date | null, unit: TimeUnit): Promise<SeriesPoint[]> {
  // `unit` comes from the fixed RANGE_UNIT map — safe to inline raw.
  const orderBucket = sql<string>`(extract(epoch from date_trunc('${sql.raw(unit)}', ${orders.createdAt}))::bigint)`;
  const userBucket = sql<string>`(extract(epoch from date_trunc('${sql.raw(unit)}', ${users.createdAt}))::bigint)`;

  const orderWhere = cutoff
    ? and(gte(orders.createdAt, cutoff), inArray(orders.status, SUCCESSFUL_STATUSES))
    : inArray(orders.status, SUCCESSFUL_STATUSES);

  const [orderRows, userRows] = await Promise.all([
    db
      .select({
        bucket: orderBucket,
        orders: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(case when ${orders.status} = 'refunded' then 0 else ${orders.totalPrice} end), 0)::text`,
      })
      .from(orders)
      .where(orderWhere)
      .groupBy(orderBucket),
    db
      .select({
        bucket: userBucket,
        clients: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(cutoff ? gte(users.createdAt, cutoff) : sql`true`)
      .groupBy(userBucket),
  ]);

  const byBucket = new Map<number, { revenue: number; orders: number; clients: number }>();
  const at = (ms: number) => {
    let p = byBucket.get(ms);
    if (!p) {
      p = { revenue: 0, orders: 0, clients: 0 };
      byBucket.set(ms, p);
    }
    return p;
  };
  for (const r of orderRows) {
    const p = at(Number(r.bucket) * 1000);
    p.orders = r.orders;
    p.revenue = Number(r.revenue);
  }
  for (const r of userRows) {
    at(Number(r.bucket) * 1000).clients = r.clients;
  }

  if (byBucket.size === 0) return [];

  // Zero-fill from the cutoff (or earliest data for "all") to now.
  const firstData = Math.min(...byBucket.keys());
  const start = cutoff ? truncUTC(cutoff, unit) : new Date(firstData);
  const end = truncUTC(new Date(), unit);

  const points: SeriesPoint[] = [];
  for (let d = start; d <= end && points.length < 500; d = addUnit(d, unit)) {
    const t = d.getTime();
    const p = byBucket.get(t);
    points.push({ t, revenue: p?.revenue ?? 0, orders: p?.orders ?? 0, clients: p?.clients ?? 0 });
  }
  return points;
}

/**
 * Order status composition within the range. Abandoned checkouts (cancelled
 * with no paymentId) are excluded — they're noise, not business outcomes.
 */
async function getStatusBreakdown(cutoff: Date | null) {
  const meaningful = or(
    inArray(orders.status, SUCCESSFUL_STATUSES),
    and(eq(orders.status, "cancelled"), isNotNull(orders.paymentId))
  );

  const rows = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(cutoff ? and(gte(orders.createdAt, cutoff), meaningful) : meaningful)
    .groupBy(orders.status)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r) => ({ status: r.status ?? "paid", count: r.count }));
}

async function getTopServices(cutoff: Date | null) {
  const orderFilter = cutoff
    ? and(inArray(orders.status, SUCCESSFUL_STATUSES), gte(orders.createdAt, cutoff))
    : inArray(orders.status, SUCCESSFUL_STATUSES);

  const rows = await db
    .select({
      id: services.id,
      title: services.title,
      sold: sql<number>`count(${orderItems.id})::int`,
      revenue: sql<string>`coalesce(sum(${orderItems.priceAtPurchase} * coalesce(${orderItems.quantity}, 1)), 0)::text`,
    })
    .from(services)
    .innerJoin(orderItems, eq(orderItems.serviceId, services.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(orderFilter)
    .groupBy(services.id, services.title)
    .orderBy(desc(sql<number>`count(${orderItems.id})`))
    .limit(5);

  return rows.map((r) => ({ title: r.title, sold: r.sold, revenue: Number(r.revenue) }));
}

async function getRecentOrders(): Promise<OrderRow[]> {
  const rows = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      status: orders.status,
      totalPrice: orders.totalPrice,
      createdAt: orders.createdAt,
      paymentId: orders.paymentId,
      paymentMethod: orders.paymentMethod,
      isTestPayment: orders.isTestPayment,
      username: users.username,
      email: users.email,
      telegramUsername: users.telegramUsername,
      boosterId: orders.boosterId,
      boosterFirstName: boosters.firstName,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(boosters, eq(orders.boosterId, boosters.id))
    .orderBy(desc(orders.createdAt))
    .limit(8);

  // Attach line items (compact: title + qty/period) for the Позиции column,
  // mirroring the Orders API so both tables render identically.
  const orderIds = rows.map((o) => o.id);
  const itemRows = orderIds.length
    ? await db
        .select({
          orderId: orderItems.orderId,
          title: services.title,
          quantity: orderItems.quantity,
          startDate: orderItems.startDate,
          endDate: orderItems.endDate,
        })
        .from(orderItems)
        .leftJoin(services, eq(orderItems.serviceId, services.id))
        .where(inArray(orderItems.orderId, orderIds))
    : [];

  const itemsByOrder = new Map<string, OrderRow["items"]>();
  for (const it of itemRows) {
    if (!it.orderId) continue;
    const arr = itemsByOrder.get(it.orderId) ?? [];
    arr.push({
      title: it.title,
      quantity: it.quantity,
      startDate: it.startDate ? String(it.startDate) : null,
      endDate: it.endDate ? String(it.endDate) : null,
    });
    itemsByOrder.set(it.orderId, arr);
  }

  return rows.map((o) => ({
    ...o,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : "",
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const cutoff = rangeCutoff(range);
  const unit = RANGE_UNIT[range];
  const suffix = RANGE_SUFFIX[range];

  const [stats, prevStats, series, statuses, top, recent] = await Promise.all([
    getStats(cutoff),
    getPrevStats(cutoff),
    getTimeSeries(cutoff, unit),
    getStatusBreakdown(cutoff),
    getTopServices(cutoff),
    getRecentOrders(),
  ]);

  const deltas = {
    revenue: pctChange(stats.revenue, prevStats?.revenue),
    orders: pctChange(stats.orderCount, prevStats?.orderCount),
    clients: pctChange(stats.userCount, prevStats?.userCount),
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Быстрая сводка по магазину {suffix}
          </p>
        </div>
        <TimeRangeSelect value={range} />
      </div>

      {/* Revenue (hero) + pending/statuses column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <MetricHeader
            label={`Выручка ${suffix}`}
            value={`${stats.revenue.toLocaleString("ru-RU")} ₽`}
            delta={deltas.revenue}
            icon={TrendingUp}
            iconClass="bg-primary/10 text-primary"
          />
          <CardContent>
            {series.length === 0 ? (
              <EmptyChart />
            ) : (
              <RevenueAreaChart data={series} unit={unit} />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <MetricHeader
              label="Ожидают выполнения"
              value={stats.awaitingFulfilment.toString()}
              delta={null}
              icon={Clock}
              iconClass="bg-amber-100 text-amber-600"
            />
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Статусы заказов</CardTitle>
              <CardDescription>Распределение {suffix}</CardDescription>
            </CardHeader>
            <CardContent>
              {statuses.length === 0 ? <EmptyChart /> : <OrderStatusDonut data={statuses} />}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders + clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <MetricHeader
            label={`Заказы ${suffix}`}
            value={stats.orderCount.toLocaleString("ru-RU")}
            delta={deltas.orders}
            icon={ShoppingBag}
            iconClass="bg-sky-100 text-sky-600"
          />
          <CardContent>
            {series.length === 0 ? <EmptyChart /> : <OrdersBarChart data={series} unit={unit} />}
          </CardContent>
        </Card>
        <Card>
          <MetricHeader
            label={`Новые клиенты ${suffix}`}
            value={stats.userCount.toLocaleString("ru-RU")}
            delta={deltas.clients}
            icon={UsersIcon}
            iconClass="bg-emerald-100 text-emerald-600"
          />
          <CardContent>
            {series.length === 0 ? <EmptyChart /> : <ClientsLineChart data={series} unit={unit} />}
          </CardContent>
        </Card>
      </div>

      {/* Top services */}
      <Card>
        <CardHeader>
          <CardTitle>Топ услуги</CardTitle>
          <CardDescription>Самые продаваемые услуги {suffix}</CardDescription>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? <EmptyChart /> : <TopServicesChart data={top} />}
        </CardContent>
      </Card>

      {/* Recent orders — same table component as /admin/orders */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Последние заказы</h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
          >
            Все заказы
            <ArrowRight className="size-4" strokeWidth={2.25} />
          </Link>
        </div>

        <RecentOrdersTable initialOrders={recent} />
      </section>
    </div>
  );
}

/** Big bold number + colored icon chip + delta badge — the headline of each card. */
function MetricHeader({
  label,
  value,
  delta,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  delta: number | null;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClass: string;
}) {
  return (
    <CardHeader>
      <CardDescription>{label}</CardDescription>
      <CardTitle className="text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </CardTitle>
      <CardAction>
        <div className={cn("flex size-10 items-center justify-center rounded-xl", iconClass)}>
          <Icon className="size-5" strokeWidth={2.25} />
        </div>
      </CardAction>
      {delta !== null && (
        <div className="flex items-center gap-2">
          <DeltaBadge pct={delta} />
          <span className="text-xs text-muted-foreground">к пред. периоду</span>
        </div>
      )}
    </CardHeader>
  );
}

function DeltaBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  const Arrow = up ? TrendingUp : TrendingDown;
  return (
    <Badge
      className={cn(
        "gap-1 font-semibold",
        up ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      )}
    >
      <Arrow className="size-3" />
      {up ? "+" : ""}
      {pct.toFixed(0)}%
    </Badge>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      Нет данных за выбранный период
    </div>
  );
}
