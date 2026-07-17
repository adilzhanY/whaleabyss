import Link from "next/link";
import { db } from "@/lib/db";
import { orders, orderItems, services, users, boosters } from "@/lib/schema";
import { desc, eq, sql, and, or, gte, lt, ne, inArray, isNotNull } from "drizzle-orm";
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
import MonthSelect from "./_components/MonthSelect";
import PageHeader from "./_components/PageHeader";
import { LESSON_CUTOFF, OWNER_BOOSTER_ID } from "./_components/lessonOrders";
import {
  NetRevenueAreaChart,
  BoosterRevenueChart,
  OrdersBarChart,
  ClientsLineChart,
  TopServicesChart,
  BoostersChart,
  OrderStatusDonut,
  type SeriesPoint,
  type BoosterSeriesPoint,
} from "./_components/DashboardCharts";

export const dynamic = "force-dynamic";

const SUCCESSFUL_STATUSES = ["paid", "in_progress", "completed", "refunded"] as const;

// ── Month window ─────────────────────────────────────────────────────────────
// The dashboard shows exactly one calendar month (picked with ‹ Май 2026 ›),
// bucketed into quarters of the month: days 1–7, 8–14, 15–21, 22–end.

interface MonthWindow {
  /** "YYYY-MM" */
  key: string;
  start: Date;
  end: Date;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const cur = currentMonthKey();
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return cur;
  // "YYYY-MM" compares correctly as a string — never show a future month.
  return value <= cur ? value : cur;
}

function monthWindow(key: string): MonthWindow {
  const [y, m] = key.split("-").map(Number);
  return { key, start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

function prevMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

const MONTHS_ACC = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

/** «за май 2026» — plugged into card descriptions. */
function monthSuffix(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `за ${MONTHS_ACC[m - 1]} ${y}`;
}

/** X-axis labels for the four quarters of the month ("22–31" adapts to length). */
function quarterLabels(key: string): string[] {
  const [y, m] = key.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return ["1–7", "8–14", "15–21", `22–${daysInMonth}`];
}

/** Quarter-of-month index 0..3 — must mirror quarterLabels (UTC session). */
const orderQuarter = sql<number>`least((extract(day from ${orders.createdAt})::int - 1) / 7, 3)`;
const userQuarter = sql<number>`least((extract(day from ${users.createdAt})::int - 1) / 7, 3)`;

// ── Money that actually reached us ───────────────────────────────────────────
// Orders created before LESSON_CUTOFF are «учебные»: fulfilled, but the
// proceeds went to a wrong crypto address and are gone. They stay in the DB
// untouched and still count as orders (and for booster commission), but every
// revenue figure zeroes them out. This also covers the owner-booster's
// pre-cutoff orders. Refunds are zeroed as before.
const realRevenue = sql<string>`coalesce(sum(case when ${orders.status} = 'refunded' or ${orders.createdAt} < ${LESSON_CUTOFF} then 0 else ${orders.totalPrice} end), 0)::text`;
// Commission subtracted from the net-revenue figure: only on orders whose
// revenue is counted (post-cutoff, not refunded) and never the owner's cut.
const realCommission = sql<string>`coalesce(sum(case when ${orders.status} = 'refunded' or ${orders.createdAt} < ${LESSON_CUTOFF} or ${orders.boosterId} = ${OWNER_BOOSTER_ID} then 0 else coalesce(${orders.boosterEarning}, 0) end), 0)::text`;

function inWindow(win: MonthWindow) {
  return and(gte(orders.createdAt, win.start), lt(orders.createdAt, win.end));
}

async function getStats(win: MonthWindow) {
  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: realRevenue,
      commission: realCommission,
    })
    .from(orders)
    .where(and(inWindow(win), inArray(orders.status, SUCCESSFUL_STATUSES)));

  // Awaiting-fulfilment is a current-state count; not affected by the month.
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(inArray(orders.status, ["paid", "in_progress"]));

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(gte(users.createdAt, win.start), lt(users.createdAt, win.end)));

  const revenue = Number(orderStats?.revenue ?? 0);
  const commissionPaid = Number(orderStats?.commission ?? 0);

  return {
    orderCount: orderStats?.count ?? 0,
    revenue,
    commissionPaid,
    net: revenue - commissionPaid,
    awaitingFulfilment: pending?.count ?? 0,
    userCount: userCount?.count ?? 0,
  };
}

/**
 * Same headline stats for the previous calendar month — powers the
 * «+12% к пред. месяцу» delta badges.
 */
async function getPrevStats(win: MonthWindow) {
  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: realRevenue,
    })
    .from(orders)
    .where(and(inWindow(win), inArray(orders.status, SUCCESSFUL_STATUSES)));

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(gte(users.createdAt, win.start), lt(users.createdAt, win.end)));

  return {
    orderCount: orderStats?.count ?? 0,
    revenue: Number(orderStats?.revenue ?? 0),
    userCount: userCount?.count ?? 0,
  };
}

/** Percent change vs the previous month; null when there's no baseline. */
function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// ── Time series for the charts ───────────────────────────────────────────────

/**
 * Revenue + orders + new clients bucketed by quarter of the selected month.
 * All four quarters are always present (zero-filled) so the axis is stable.
 */
async function getTimeSeries(win: MonthWindow): Promise<SeriesPoint[]> {
  const [orderRows, userRows] = await Promise.all([
    db
      .select({
        bucket: orderQuarter,
        orders: sql<number>`count(*)::int`,
        revenue: realRevenue,
        commission: realCommission,
      })
      .from(orders)
      .where(and(inWindow(win), inArray(orders.status, SUCCESSFUL_STATUSES)))
      .groupBy(orderQuarter),
    db
      .select({
        bucket: userQuarter,
        clients: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(and(gte(users.createdAt, win.start), lt(users.createdAt, win.end)))
      .groupBy(userQuarter),
  ]);

  if (orderRows.length === 0 && userRows.length === 0) return [];

  const orderBy = new Map(orderRows.map((r) => [Number(r.bucket), r]));
  const userBy = new Map(userRows.map((r) => [Number(r.bucket), r]));

  return quarterLabels(win.key).map((label, i) => {
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
 * Booster commission earned per quarter of the month, with the top-5 earners
 * for the tooltip. Lesson (pre-cutoff) orders DO count here — the boosters'
 * money is real even though ours is gone. The owner-booster never counts.
 */
async function getBoosterTimeSeries(win: MonthWindow): Promise<BoosterSeriesPoint[]> {
  const rows = await db
    .select({
      bucket: orderQuarter,
      name: sql<string>`${boosters.firstName} || ' ' || ${boosters.lastName}`,
      earned: sql<string>`coalesce(sum(${orders.boosterEarning}), 0)::text`,
    })
    .from(orders)
    .innerJoin(boosters, eq(orders.boosterId, boosters.id))
    .where(
      and(
        inWindow(win),
        isNotNull(orders.boosterEarning),
        ne(orders.status, "refunded"),
        ne(orders.boosterId, OWNER_BOOSTER_ID)
      )
    )
    .groupBy(orderQuarter, boosters.id, boosters.firstName, boosters.lastName);

  const byBucket = new Map<number, { total: number; entries: { name: string; earned: number }[] }>();
  for (const r of rows) {
    const earned = Number(r.earned);
    if (earned <= 0) continue;
    const idx = Number(r.bucket);
    let b = byBucket.get(idx);
    if (!b) {
      b = { total: 0, entries: [] };
      byBucket.set(idx, b);
    }
    b.total += earned;
    b.entries.push({ name: r.name, earned });
  }

  if (byBucket.size === 0) return [];

  return quarterLabels(win.key).map((label, i) => {
    const b = byBucket.get(i);
    const top = b ? [...b.entries].sort((a, z) => z.earned - a.earned).slice(0, 5) : [];
    return { label, total: b?.total ?? 0, top };
  });
}

/**
 * Order status composition within the month. Abandoned checkouts (cancelled
 * with no paymentId) are excluded — they're noise, not business outcomes.
 */
async function getStatusBreakdown(win: MonthWindow) {
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

async function getTopServices(win: MonthWindow) {
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
 * Workload per booster within the month: orders they handled (in_progress +
 * completed) and the commission credited (boosterEarning, set on completion).
 * Left join keeps zero-order boosters eligible; only the top 3 are shown.
 * Lesson orders count — the boosters' cut is real money either way.
 */
async function getBoosterStats(win: MonthWindow) {
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
      telegramUsername: users.telegramUsername,
      boosterId: orders.boosterId,
      boosterFirstName: boosters.firstName,
      boosterOnline: orders.boosterOnline,
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
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const { month: monthParam } = await searchParams;
  const monthKey = parseMonth(monthParam);
  const win = monthWindow(monthKey);
  const prevWin = monthWindow(prevMonthKey(monthKey));
  const suffix = monthSuffix(monthKey);

  const [stats, prevStats, series, boosterSeries, statuses, top, boosterStats, recent] =
    await Promise.all([
      getStats(win),
      getPrevStats(prevWin),
      getTimeSeries(win),
      getBoosterTimeSeries(win),
      getStatusBreakdown(win),
      getTopServices(win),
      getBoosterStats(win),
      getRecentOrders(),
    ]);

  const deltas = {
    revenue: pctChange(stats.revenue, prevStats?.revenue),
    orders: pctChange(stats.orderCount, prevStats?.orderCount),
    clients: pctChange(stats.userCount, prevStats?.userCount),
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4">
      <PageHeader subtitle={`Быстрая сводка по магазину ${suffix}`} />
      <div className="flex items-start justify-start gap-4 flex-wrap">
        <MonthSelect month={monthKey} isCurrent={monthKey === currentMonthKey()} />
      </div>

      {/* Row 1: revenue hero (gross vs net overlay) + pending/statuses column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardDescription>Выручка {suffix}</CardDescription>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
              <RevenueStat
                label="Получено"
                value={stats.revenue}
                color="var(--chart-2)"
                delta={deltas.revenue}
              />
              <RevenueStat
                label="Чистыми (после комиссий)"
                value={stats.net}
                color="var(--chart-3)"
                delta={null}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            {series.length === 0 ? <EmptyChart /> : <NetRevenueAreaChart data={series} />}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
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

      {/* Row 1.6: booster earnings over time (top-5 earners in the tooltip) */}
      <Card>
        <CardHeader>
          <CardTitle>Заработок бустеров</CardTitle>
          <CardDescription>Сумма комиссий {suffix} · топ-5 в подсказке</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-end">
          {boosterSeries.length === 0 ? (
            <EmptyChart />
          ) : (
            <BoosterRevenueChart data={boosterSeries} />
          )}
        </CardContent>
      </Card>

      {/* Row 2: all four comparison charts side by side on wide screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <MetricHeader
            label={`Заказы ${suffix}`}
            value={stats.orderCount.toLocaleString("ru-RU")}
            delta={deltas.orders}
            icon={ShoppingBag}
            iconClass="bg-sky-100 text-sky-600"
          />
          <CardContent className="flex-1 flex items-end">
            {series.length === 0 ? <EmptyChart /> : <OrdersBarChart data={series} />}
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
          <CardContent className="flex-1 flex items-end">
            {series.length === 0 ? <EmptyChart /> : <ClientsLineChart data={series} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Топ услуги</CardTitle>
            <CardDescription>Продажи {suffix}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center">
            {top.length === 0 ? <EmptyChart /> : <TopServicesChart data={top} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Бустеры</CardTitle>
            <CardDescription>Заказы и заработок {suffix}</CardDescription>
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
          <span className="text-xs text-muted-foreground">к пред. месяцу</span>
        </div>
      )}
    </CardHeader>
  );
}

/** One labelled money figure with a color swatch — used for the gross/net pair
 *  on top of the revenue hero. The swatch matches the chart's area color. */
function RevenueStat({
  label,
  value,
  color,
  delta,
}: {
  label: string;
  value: number;
  color: string;
  delta: number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="text-3xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString("ru-RU")} ₽
      </span>
      {delta !== null && (
        <div className="flex items-center gap-2">
          <DeltaBadge pct={delta} />
          <span className="text-xs text-muted-foreground">к пред. месяцу</span>
        </div>
      )}
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
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      Нет данных за выбранный период
    </div>
  );
}
