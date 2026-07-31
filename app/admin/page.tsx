import Link from "next/link";
import { db } from "@/lib/db";
import { orders, orderItems, services, users, boosters } from "@/lib/schema";
import { desc, eq, sql, and, or, gte, lt, ne, inArray, isNotNull } from "drizzle-orm";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import RecentOrdersTable from "./_components/RecentOrdersTable";
import type { OrderRow } from "./_components/orderColumns";
import PeriodSelect from "./_components/PeriodSelect";
import PageHeader from "./_components/PageHeader";
import { LESSON_CUTOFF, OWNER_BOOSTER_ID } from "./_components/lessonOrders";
import { notTestOrder } from "@/lib/testOrders";
import {
  buildWindow,
  daysInMonth,
  isCurrentWindow,
  MONTH_BUCKETS,
  parseAnchor,
  parsePeriod,
  previousWindow,
  type PeriodWindow,
} from "./_components/period";
import {
  ProfitBreakdownChart,
  OrdersBarChart,
  ClientsLineChart,
  TopServicesChart,
  BoostersChart,
  OrderStatusDonut,
  type SeriesPoint,
} from "./_components/DashboardCharts";

export const dynamic = "force-dynamic";

const SUCCESSFUL_STATUSES = ["paid", "in_progress", "completed", "refunded"] as const;

// ── Money that actually reached us ───────────────────────────────────────────
// Orders created before LESSON_CUTOFF are «учебные»: fulfilled, but the
// proceeds went to a wrong crypto address and are gone. They stay in the DB
// untouched and still count as orders (and for booster commission), but every
// revenue figure zeroes them out. This also covers the owner-booster's
// pre-cutoff orders. Refunds are zeroed as before.
const realRevenue = sql<string>`coalesce(sum(case when ${orders.status} = 'refunded' or ${orders.createdAt} < ${LESSON_CUTOFF} then 0 else ${orders.totalPrice} end), 0)::text`;
// Commission subtracted from the profit figure: only on orders whose revenue
// is counted (post-cutoff, not refunded) and never the owner's cut.
const realCommission = sql<string>`coalesce(sum(case when ${orders.status} = 'refunded' or ${orders.createdAt} < ${LESSON_CUTOFF} or ${orders.boosterId} = ${OWNER_BOOSTER_ID} then 0 else coalesce(${orders.boosterEarning}, 0) end), 0)::text`;
// Orders whose money we actually counted — the denominator for средний чек.
// Dividing revenue by ALL orders would understate it in any window that still
// contains written-off ones.
const revenueOrderCount = sql<number>`count(*) filter (where ${orders.status} <> 'refunded' and ${orders.createdAt} >= ${LESSON_CUTOFF})::int`;

// Every dashboard figure is scoped by this, so `notTestOrder` here is what
// keeps admin test orders out of revenue, profit, counts and charts at once.
function inWindow(win: PeriodWindow) {
  return and(gte(orders.createdAt, win.start), lt(orders.createdAt, win.end), notTestOrder);
}

/**
 * Bucket index inside the window, mirroring `win.bucketLabels`:
 * month → one of MONTH_BUCKETS equal slices of the month, quarter → month of
 * quarter (0–2), year → month of year (0–11).
 */
function bucketExpr(win: PeriodWindow, column: typeof orders.createdAt | typeof users.createdAt) {
  if (win.period === "month") {
    // Integer division mirrors `dayBucket()` exactly — same formula, so a row
    // always lands under the label that names its days. Both operands are
    // inlined (see the note below) and derived from our own window.
    const days = daysInMonth(win.start.getUTCFullYear(), win.start.getUTCMonth() + 1);
    return sql<number>`least(((extract(day from ${column})::int - 1) * ${sql.raw(String(MONTH_BUCKETS))}) / ${sql.raw(String(days))}, ${sql.raw(String(MONTH_BUCKETS - 1))})`;
  }
  // Inlined as a literal, not bound: Postgres can't infer the type of a bare
  // parameter inside `extract(...)::int - $1`, and the query fails outright.
  // The value is our own month index (1–12), so there is nothing to escape.
  const firstMonth = win.start.getUTCMonth() + 1;
  return sql<number>`extract(month from ${column})::int - ${sql.raw(String(firstMonth))}`;
}

async function getStats(win: PeriodWindow) {
  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: realRevenue,
      commission: realCommission,
      countedOrders: revenueOrderCount,
      buyers: sql<number>`count(distinct ${orders.userId})::int`,
    })
    .from(orders)
    .where(and(inWindow(win), inArray(orders.status, SUCCESSFUL_STATUSES)));

  // Awaiting-fulfilment is a current-state count; not affected by the window.
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(inArray(orders.status, ["paid", "in_progress"]), notTestOrder));

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(gte(users.createdAt, win.start), lt(users.createdAt, win.end)));

  // Buyers with more than one order in the window — the loyalty signal.
  const [repeat] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(
      db
        .select({ userId: orders.userId })
        .from(orders)
        .where(and(inWindow(win), inArray(orders.status, SUCCESSFUL_STATUSES), isNotNull(orders.userId)))
        .groupBy(orders.userId)
        .having(sql`count(*) > 1`)
        .as("repeat_buyers")
    );

  const revenue = Number(orderStats?.revenue ?? 0);
  const commissionPaid = Number(orderStats?.commission ?? 0);
  const counted = orderStats?.countedOrders ?? 0;

  return {
    orderCount: orderStats?.count ?? 0,
    revenue,
    commissionPaid,
    net: revenue - commissionPaid,
    avgOrder: counted > 0 ? Math.round(revenue / counted) : 0,
    buyers: orderStats?.buyers ?? 0,
    repeatBuyers: repeat?.count ?? 0,
    awaitingFulfilment: pending?.count ?? 0,
    userCount: userCount?.count ?? 0,
  };
}

/** Headline figures for the previous window — powers the delta badges. */
async function getPrevStats(win: PeriodWindow) {
  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: realRevenue,
      commission: realCommission,
    })
    .from(orders)
    .where(and(inWindow(win), inArray(orders.status, SUCCESSFUL_STATUSES)));

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(gte(users.createdAt, win.start), lt(users.createdAt, win.end)));

  const revenue = Number(orderStats?.revenue ?? 0);
  const commission = Number(orderStats?.commission ?? 0);

  return {
    orderCount: orderStats?.count ?? 0,
    revenue,
    net: revenue - commission,
    userCount: userCount?.count ?? 0,
  };
}

/** Percent change vs the previous window; null when there's no baseline. */
function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// ── Time series ──────────────────────────────────────────────────────────────

/**
 * Revenue / commission / orders / clients per bucket of the window. Every
 * bucket is always present (zero-filled) so the axis is stable.
 */
async function getTimeSeries(win: PeriodWindow): Promise<SeriesPoint[]> {
  const orderBucket = bucketExpr(win, orders.createdAt);
  const userBucket = bucketExpr(win, users.createdAt);

  const [orderRows, userRows] = await Promise.all([
    db
      .select({
        bucket: orderBucket,
        orders: sql<number>`count(*)::int`,
        revenue: realRevenue,
        commission: realCommission,
      })
      .from(orders)
      .where(and(inWindow(win), inArray(orders.status, SUCCESSFUL_STATUSES)))
      .groupBy(orderBucket),
    db
      .select({
        bucket: userBucket,
        clients: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(and(gte(users.createdAt, win.start), lt(users.createdAt, win.end)))
      .groupBy(userBucket),
  ]);

  if (orderRows.length === 0 && userRows.length === 0) return [];

  const orderBy = new Map(orderRows.map((r) => [Number(r.bucket), r]));
  const userBy = new Map(userRows.map((r) => [Number(r.bucket), r]));

  return win.bucketLabels.map((label, i) => {
    const o = orderBy.get(i);
    const revenue = Number(o?.revenue ?? 0);
    const commission = Number(o?.commission ?? 0);
    return {
      label,
      revenue,
      orders: o?.orders ?? 0,
      clients: userBy.get(i)?.clients ?? 0,
      commission,
      net: revenue - commission,
    };
  });
}

/**
 * Order status composition within the window. Abandoned checkouts (cancelled
 * with no paymentId) are excluded — they're noise, not business outcomes.
 */
async function getStatusBreakdown(win: PeriodWindow) {
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
    .where(and(inWindow(win), meaningful))
    .groupBy(orders.status)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r) => ({ status: r.status ?? "paid", count: r.count }));
}

async function getTopServices(win: PeriodWindow) {
  const rows = await db
    .select({
      id: services.id,
      title: services.title,
      sold: sql<number>`count(${orderItems.id})::int`,
      // Lesson orders sell, but their money is gone — zero them here too.
      revenue: sql<string>`coalesce(sum(case when ${orders.createdAt} < ${LESSON_CUTOFF} then 0 else ${orderItems.priceAtPurchase} * coalesce(${orderItems.quantity}, 1) end), 0)::text`,
    })
    .from(services)
    .innerJoin(orderItems, eq(orderItems.serviceId, services.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(inWindow(win), inArray(orders.status, SUCCESSFUL_STATUSES)))
    .groupBy(services.id, services.title)
    .orderBy(desc(sql<number>`count(${orderItems.id})`))
    .limit(5);

  return rows.map((r) => ({ title: r.title, sold: r.sold, revenue: Number(r.revenue) }));
}

/**
 * Workload per booster within the window: orders they handled (in_progress +
 * completed) and the commission credited (boosterEarning, set on completion).
 * Left join keeps zero-order boosters eligible; only the top 3 are shown.
 * Lesson orders count — the boosters' cut is real money either way.
 */
async function getBoosterStats(win: PeriodWindow) {
  const joinBase = and(
    eq(orders.boosterId, boosters.id),
    inArray(orders.status, ["in_progress", "completed"]),
    inWindow(win)
  );

  const rows = await db
    .select({
      name: sql<string>`${boosters.firstName} || ' ' || ${boosters.lastName}`,
      orders: sql<number>`count(${orders.id})::int`,
      earned: sql<string>`coalesce(sum(${orders.boosterEarning}), 0)::text`,
    })
    .from(boosters)
    .leftJoin(orders, joinBase)
    .where(and(eq(boosters.status, "active"), ne(boosters.id, OWNER_BOOSTER_ID)))
    .groupBy(boosters.id, boosters.firstName, boosters.lastName)
    .orderBy(desc(sql`count(${orders.id})`))
    .limit(3);

  return rows.map((r) => ({ name: r.name, orders: r.orders, earned: Number(r.earned) }));
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
      avatarUrl: users.avatarUrl,
      telegramUsername: users.telegramUsername,
      boosterId: orders.boosterId,
      boosterFirstName: boosters.firstName,
      boosterOnline: orders.boosterOnline,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(boosters, eq(orders.boosterId, boosters.id))
    .where(notTestOrder)
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

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

/**
 * Dashboard, «отчёт о прибыли» layout: profit is the headline and the card
 * shows how it was reached — выручка − комиссии качеров = прибыль — over the
 * chosen window. Everything else is a compact list beside it.
 *
 * Deliberately NOT four equal tiles: the money story is one story, and the
 * separate «Заработок бустеров» card that used to sit below duplicated the
 * commission series that now forms the amber half of the profit chart.
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[]; anchor?: string | string[]; month?: string | string[] }>;
}) {
  const { period: periodParam, anchor: anchorParam, month: legacyMonth } = await searchParams;
  const period = parsePeriod(periodParam);
  // `?month=` is the old param name — keep honouring bookmarked links.
  const win = buildWindow(period, parseAnchor(anchorParam ?? legacyMonth));
  const prevWin = previousWindow(win);

  const [stats, prevStats, series, statuses, top, boosterStats, recent] = await Promise.all([
    getStats(win),
    getPrevStats(prevWin),
    getTimeSeries(win),
    getStatusBreakdown(win),
    getTopServices(win),
    getBoosterStats(win),
    getRecentOrders(),
  ]);

  const deltas = {
    profit: pctChange(stats.net, prevStats?.net),
    revenue: pctChange(stats.revenue, prevStats?.revenue),
    orders: pctChange(stats.orderCount, prevStats?.orderCount),
    clients: pctChange(stats.userCount, prevStats?.userCount),
  };
  const margin = stats.revenue > 0 ? Math.round((stats.net / stats.revenue) * 100) : null;
  const commissionShare =
    stats.revenue > 0 ? Math.round((stats.commissionPaid / stats.revenue) * 100) : null;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4">
      <PageHeader subtitle={`Быстрая сводка по магазину ${win.suffix}`} />
      <PeriodSelect
        period={win.period}
        anchor={win.anchor}
        label={win.label}
        isCurrent={isCurrentWindow(win)}
      />

      {/* Row 1: profit hero + the rest of the numbers as a list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardDescription>Прибыль {win.suffix}</CardDescription>
            <CardTitle className="text-4xl font-bold tracking-tight tabular-nums">
              {rub(stats.net)}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {deltas.profit !== null && <DeltaBadge pct={deltas.profit} />}
              <span className="text-xs text-muted-foreground">
                {deltas.profit !== null ? win.prevLabel : "не с чем сравнить"}
                {margin !== null && ` · маржа ${margin}%`}
              </span>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4">
            {/* Выручка − комиссии = прибыль, spelled out. */}
            <div className="flex flex-wrap items-stretch gap-x-2 gap-y-3 border-y border-border py-3">
              <Figure
                label="Выручка"
                value={rub(stats.revenue)}
                hint={`${stats.orderCount.toLocaleString("ru-RU")} ${plural(stats.orderCount, ["заказ", "заказа", "заказов"])}`}
              />
              <Operator>−</Operator>
              <Figure
                label="Комиссии качеров"
                value={rub(stats.commissionPaid)}
                hint={commissionShare !== null ? `${commissionShare}% от выручки` : undefined}
                className="text-amber-600"
              />
              <Operator>=</Operator>
              <Figure
                label="Прибыль"
                value={rub(stats.net)}
                hint={margin !== null ? `маржа ${margin}%` : undefined}
                className="text-[var(--chart-1)]"
              />
            </div>

            <div className="flex flex-1 items-stretch">
              {series.length === 0 ? <EmptyChart /> : <ProfitBreakdownChart data={series} />}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Ещё {win.suffix}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              <StatRow
                label="Продажи"
                value={stats.orderCount.toLocaleString("ru-RU")}
                delta={deltas.orders}
              />
              <StatRow
                label="Новые клиенты"
                value={stats.userCount.toLocaleString("ru-RU")}
                delta={deltas.clients}
              />
              <StatRow label="Средний чек" value={rub(stats.avgOrder)} delta={null} />
              <StatRow
                label="Повторные покупатели"
                value={`${stats.repeatBuyers} / ${stats.buyers}`}
                delta={null}
              />
              <StatRow
                label="Ожидают выполнения"
                value={stats.awaitingFulfilment.toLocaleString("ru-RU")}
                delta={null}
                accent={stats.awaitingFulfilment > 0}
              />
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Статусы заказов</CardTitle>
              <CardDescription>Распределение {win.suffix}</CardDescription>
            </CardHeader>
            <CardContent>
              {statuses.length === 0 ? <EmptyChart /> : <OrderStatusDonut data={statuses} />}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: the supporting charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Заказы {win.suffix}</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight tabular-nums">
              {stats.orderCount.toLocaleString("ru-RU")}
            </CardTitle>
            {deltas.orders !== null && (
              <div className="flex items-center gap-2">
                <DeltaBadge pct={deltas.orders} />
                <span className="text-xs text-muted-foreground">{win.prevLabel}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            {series.length === 0 ? <EmptyChart /> : <OrdersBarChart data={series} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Новые клиенты {win.suffix}</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight tabular-nums">
              {stats.userCount.toLocaleString("ru-RU")}
            </CardTitle>
            {deltas.clients !== null && (
              <div className="flex items-center gap-2">
                <DeltaBadge pct={deltas.clients} />
                <span className="text-xs text-muted-foreground">{win.prevLabel}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            {series.length === 0 ? <EmptyChart /> : <ClientsLineChart data={series} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Топ услуги</CardTitle>
            <CardDescription>Продажи {win.suffix}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center">
            {top.length === 0 ? <EmptyChart /> : <TopServicesChart data={top} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Качеры</CardTitle>
            <CardDescription>Заказы и заработок {win.suffix}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center">
            {boosterStats.length === 0 ? <EmptyChart /> : <BoostersChart data={boosterStats} />}
          </CardContent>
        </Card>
      </div>

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

/** «30 заказов» — Russian plural for the hint under выручка. */
function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

/** One term of the выручка − комиссии = прибыль equation. */
function Figure({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className="flex min-w-[8.5rem] flex-1 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xl font-bold tracking-tight tabular-nums", className)}>
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Operator({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex shrink-0 items-center px-1 text-lg text-muted-foreground">
      {children}
    </span>
  );
}

/** Label → value row of the «Ещё за период» list. */
function StatRow({
  label,
  value,
  delta,
  accent = false,
}: {
  label: string;
  value: string;
  delta: number | null;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        {delta !== null && <DeltaBadge pct={delta} />}
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            accent && "text-amber-600"
          )}
        >
          {value}
        </span>
      </span>
    </div>
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
    <div className="flex h-[220px] w-full items-center justify-center text-sm text-muted-foreground">
      Нет данных за выбранный период
    </div>
  );
}
