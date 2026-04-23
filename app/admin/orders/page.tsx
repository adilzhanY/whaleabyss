import Link from "next/link";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/schema";
import { desc, eq, and, SQL } from "drizzle-orm";
import OrderStatusBadge, {
  ORDER_STATUSES,
  orderStatusLabel,
} from "../_components/OrderStatusBadge";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { status } = await searchParams;

  const statusFilter =
    status && ORDER_STATUSES.includes(status as any) ? status : undefined;

  const where: SQL | undefined = statusFilter
    ? and(eq(orders.status, statusFilter as any))
    : undefined;

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalPrice: orders.totalPrice,
      createdAt: orders.createdAt,
      paymentId: orders.paymentId,
      username: users.username,
      email: users.email,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(where ?? undefined)
    .orderBy(desc(orders.createdAt))
    .limit(200);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заказы</h1>
          <p className="text-sm text-slate-500 mt-1">
            {rows.length}{" "}
            {statusFilter ? `— ${orderStatusLabel(statusFilter)}` : "всего"}
          </p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <FilterPill href="/admin/orders" active={!statusFilter} label="Все" />
        {ORDER_STATUSES.map((s) => (
          <FilterPill
            key={s}
            href={`/admin/orders?status=${s}`}
            active={statusFilter === s}
            label={orderStatusLabel(s)}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
          Нет заказов.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="text-left font-medium px-6 py-3">ID</th>
                  <th className="text-left font-medium px-6 py-3">Клиент</th>
                  <th className="text-left font-medium px-6 py-3">Статус</th>
                  <th className="text-right font-medium px-6 py-3">Сумма</th>
                  <th className="text-right font-medium px-6 py-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
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
                    <td className="px-6 py-3 text-right text-slate-500 whitespace-nowrap">
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
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
        </div>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
