import Link from "next/link";
import { db } from "@/lib/db";
import { orders, orderItems, services, users, boosters } from "@/lib/schema";
import { desc, eq, sql, and, gte, inArray } from "drizzle-orm";
import {
  ShoppingBag,
  TrendingUp,
  Clock,
  Users as UsersIcon,
  ArrowRight,
} from "lucide-react";
import RecentOrdersTable from "./_components/RecentOrdersTable";
import type { OrderRow } from "./_components/orderColumns";
import TimeRangeSelect from "./_components/TimeRangeSelect";
import { TIME_RANGE_OPTIONS, type TimeRange } from "./_components/timeRange";

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
  const successfulStatuses = ["paid", "in_progress", "completed", "refunded"] as const;

  const orderWhere = cutoff
    ? and(gte(orders.createdAt, cutoff), inArray(orders.status, successfulStatuses))
    : inArray(orders.status, successfulStatuses);

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

async function getTopServices() {
  const rows = await db
    .select({
      id: services.id,
      title: services.title,
      sold: sql<number>`count(${orderItems.id})::int`,
    })
    .from(services)
    .leftJoin(orderItems, eq(orderItems.serviceId, services.id))
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .where(inArray(orders.status, ["paid", "in_progress", "completed", "refunded"]))
    .groupBy(services.id, services.title)
    .orderBy(desc(sql<number>`count(${orderItems.id})`))
    .limit(5);

  return rows;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const cutoff = rangeCutoff(range);
  const suffix = RANGE_SUFFIX[range];

  const [stats, recent, top] = await Promise.all([
    getStats(cutoff),
    getRecentOrders(),
    getTopServices(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
          <p className="text-sm text-slate-500 mt-1">
            Быстрая сводка по магазину {suffix}
          </p>
        </div>
        <TimeRangeSelect value={range} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label={`Выручка ${suffix}`}
          value={`${stats.revenue.toLocaleString("ru-RU")} ₽`}
          tone="indigo"
        />
        <StatCard
          icon={ShoppingBag}
          label={`Заказов ${suffix}`}
          value={stats.orderCount.toString()}
          tone="emerald"
        />
        <StatCard
          icon={Clock}
          label="Ожидают выполнения"
          value={stats.awaitingFulfilment.toString()}
          tone="amber"
        />
        <StatCard
          icon={UsersIcon}
          label={`Пользователей ${suffix}`}
          value={stats.userCount.toString()}
          tone="slate"
        />
      </div>

      {/* Recent orders — same table component as /admin/orders */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Последние заказы</h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Все заказы
            <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </Link>
        </div>

        <RecentOrdersTable initialOrders={recent} />
      </section>

      {/* Top services */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-5">Топ услуги</h2>
        {top.length === 0 ? (
          <div className="text-sm text-slate-500 py-4">Нет продаж.</div>
        ) : (
          <div className="space-y-3">
            {top.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold flex items-center justify-center">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.title}</div>
                </div>
                <div className="text-sm text-slate-500">
                  {s.sold} {pluralize(s.sold, ["продажа", "продажи", "продаж"])}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  tone: "indigo" | "emerald" | "amber" | "slate";
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <div
        className={`w-11 h-11 rounded-2xl ${tones[tone]} flex items-center justify-center mb-4`}
      >
        <Icon className="w-5 h-5" strokeWidth={2.25} />
      </div>
      <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1 tracking-tight">{value}</div>
    </div>
  );
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
