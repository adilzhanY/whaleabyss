import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orders, orderItems, services, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import OrderStatusBadge from "../../_components/OrderStatusBadge";
import StatusChanger from "./StatusChanger";
import RefundButton from "./RefundButton";
import DeleteOrderButton from "./DeleteOrderButton";
import CustomerNotesSection from "./CustomerNotesSection";
import { ArrowLeft, Mail, Hash, User } from "lucide-react";
import TelegramIcon from "@/components/TelegramIcon";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalPrice: orders.totalPrice,
      paymentId: orders.paymentId,
      userNotes: orders.userNotes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      userId: orders.userId,
      username: users.username,
      userEmail: users.email,
      telegramUsername: users.telegramUsername,
      gameUsername: users.gameUsername,
      receiptEmail: users.receiptEmail,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (orderRows.length === 0) notFound();
  const order = orderRows[0];

  const items = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      priceAtPurchase: orderItems.priceAtPurchase,
      startDate: orderItems.startDate,
      endDate: orderItems.endDate,
      serviceTitle: services.title,
      serviceSlug: services.slug,
    })
    .from(orderItems)
    .leftJoin(services, eq(orderItems.serviceId, services.id))
    .where(eq(orderItems.orderId, id));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
        Все заказы
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            Заказ
          </div>
          <h1 className="text-2xl font-mono tracking-tight mt-1">
            {order.id.slice(0, 8)}
            <span className="text-slate-300">
              {order.id.slice(8)}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Создан{" "}
            {order.createdAt
              ? new Date(order.createdAt).toLocaleString("ru-RU")
              : "—"}
          </p>
          {order.status === "cancelled" && !order.paymentId && (
            <p className="text-xs text-rose-600 mt-1 font-medium">
              Автоматически отменён — оплата не была получена
            </p>
          )}
        </div>
        <OrderStatusBadge status={order.status ?? "pending"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: items + notes */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Позиции</h2>
            <div className="divide-y divide-slate-100">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {it.serviceTitle ?? "— услуга удалена —"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {it.quantity} ×{" "}
                      {Number(it.priceAtPurchase).toLocaleString("ru-RU")} ₽
                    </div>
                    {it.startDate && it.endDate && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Период:{" "}
                        {new Date(it.startDate).toLocaleDateString("ru-RU")}
                        {" — "}
                        {new Date(it.endDate).toLocaleDateString("ru-RU")}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {(
                      Number(it.priceAtPurchase) * (it.quantity ?? 1)
                    ).toLocaleString("ru-RU")}{" "}
                    ₽
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 mt-3 pt-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">Итого</span>
              <span className="text-lg font-semibold">
                {Number(order.totalPrice).toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </section>

          {order.userNotes && (
            <CustomerNotesSection orderId={order.id} notes={order.userNotes} />
          )}
        </div>

        {/* Right: customer + status actions + payment meta */}
        <div className="space-y-6">
          <section className="bg-white rounded-3xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Изменить статус</h2>
            <StatusChanger
              orderId={order.id}
              initialStatus={order.status ?? "pending"}
            />
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Возврат средств</h2>
            <RefundButton
              orderId={order.id}
              orderStatus={order.status ?? "pending"}
            />
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Клиент</h2>
            <div className="space-y-3 text-sm">
              <Row icon={User} label="Имя" value={order.username ?? "— guest —"} />
              <Row icon={Mail} label="Email" value={order.userEmail ?? order.receiptEmail ?? "—"} />
              <Row
                icon={TelegramIcon}
                label="Telegram"
                value={order.telegramUsername ?? "—"}
              />
              <Row icon={User} label="Ник в игре" value={order.gameUsername ?? "—"} />
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Платёж</h2>
            <div className="space-y-3 text-sm">
              <Row
                icon={Hash}
                label="Payment ID"
                value={order.paymentId ?? "—"}
                mono
              />
              <Row
                icon={Hash}
                label="Обновлён"
                value={
                  order.updatedAt
                    ? new Date(order.updatedAt).toLocaleString("ru-RU")
                    : "—"
                }
              />
            </div>
          </section>

          {(order.status === "cancelled" ||
            order.status === "pending" ||
            order.status === "refunded") && (
            <section className="bg-white rounded-3xl border border-rose-200 p-6">
              <h2 className="text-lg font-semibold mb-1 text-rose-700">
                Опасная зона
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Удаление заказа необратимо — запись и все её позиции будут стёрты
                навсегда. Доступно только для отменённых, ожидающих и возвращённых
                заказов.
              </p>
              <DeleteOrderButton
                orderId={order.id}
                orderStatus={order.status}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          {label}
        </div>
        <div
          className={`text-sm truncate ${mono ? "font-mono text-xs" : ""}`}
          title={value}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
