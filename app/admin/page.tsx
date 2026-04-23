import Link from "next/link";
import { db } from "@/lib/db";
import { orders, orderItems, services, users } from "@/lib/schema";
import { desc, eq, sql, and, gte } from "drizzle-orm";
import {
  ShoppingBag,
  TrendingUp,
  Clock,
  Users as UsersIcon,
  ArrowRight,
} from "lucide-react";
import OrderStatusBadge from "./_components/OrderStatusBadge";

export const dynamic = "force-dynamic";

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(${orders.totalPrice}), 0)::text`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, startOfMonth), eq(orders.status, "paid")));

  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, "paid")); // "paid" == awaiting fulfilment

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  return {
    monthOrders: monthStats?.count ?? 0,
    monthRevenue: Number(monthStats?.revenue ?? 0),
    awaitingFulfilment: pending?.count ?? 0,
    userCount: userCount?.count ?? 0,
  };
}

async function getRecentOrders() {
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalPrice: orders.totalPrice,
      createdAt: orders.createdAt,
      username: users.username,
      email: users.email,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt))
    .limit(8);

  return rows;
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
    .where(eq(orders.status, "paid"))
    .groupBy(services.id, services.title)
    .orderBy(desc(sql<number>`count(${orderItems.id})`))
    .limit(5);

  return rows;
}

export default async function AdminDashboardPage() {
  const [stats, recent, top] = await Promise.all([
    getStats(),
    getRecentOrders(),
    getTopServices(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
        <p className="text-sm text-slate-500 mt-1">
          Быстрая сводка по магазину за текущий месяц
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Выручка за месяц"
          value={`${stats.monthRevenue.toLocaleString("ru-RU")} ₽`}
          tone="indigo"
        />
        <StatCard
          icon={ShoppingBag}
          label="Заказов за месяц"
          value={stats.monthOrders.toString()}
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
          label="Пользователей"
          value={stats.userCount.toString()}
          tone="slate"
        />
      </div>

      {/* Recent orders */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Последние заказы</h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Все заказы
            <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center">
            Пока нет заказов.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left font-medium px-6 py-2">ID</th>
                  <th className="text-left font-medium px-6 py-2">Клиент</th>
                  <th className="text-left font-medium px-6 py-2">Статус</th>
                  <th className="text-right font-medium px-6 py-2">Сумма</th>
                  <th className="text-right font-medium px-6 py-2">Дата</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="hover:text-indigo-600"
                      >
                        {o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium">
                        {o.username ?? "— guest —"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {o.email ?? ""}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <OrderStatusBadge status={o.status ?? "pending"} />
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      {Number(o.totalPrice).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-6 py-3 text-right text-slate-500">
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
