"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Chip } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import OrderStatusBadge from "../../_components/OrderStatusBadge";
import PageHeader from "../../_components/PageHeader";
import DataTable, { type Column } from "../../_components/DataTable";
import UserCard, { EmptyRow } from "./_components/UserCard";
import UserIdentityCard, { money, shortDate } from "./_components/UserIdentityCard";
import AccessCard from "./_components/AccessCard";
import { ADDON_CHOICE_CART_LABEL, isAddonChoice } from "@/lib/addonChoice";
import type {
  CartLine,
  Order,
  PromocodeUse,
  Review,
  UserDetailPayload,
} from "./_components/types";

/**
 * Admin user card, «кокпит» layout: one identity header with a stat ribbon,
 * then a dense grid where everything is visible without a click. Deliberately
 * not tabbed — the busiest account in the DB has 6 orders, so there is nothing
 * worth hiding behind navigation.
 *
 * Every table here is the shared `DataTable`, the same component /admin/users
 * and /admin/orders use, so paging, mobile stacking and the dark palette come
 * for free instead of being re-invented per page.
 */
export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [data, setData] = useState<UserDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [cartPage, setCartPage] = useState(1);

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user details");
      setData(await res.json());
    } catch (error) {
      console.error("Failed to fetch user details:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">Пользователь не найден</p>
        </div>
      </div>
    );
  }

  const {
    user,
    orders,
    reviews,
    cart,
    cartTotal,
    cartUpdatedAt,
    promocodeUses,
    stats,
    monthlySpend,
    topServices,
  } = data;

  const orderColumns: Column<Order>[] = [
    {
      key: "id",
      header: "Заказ",
      width: "w-24",
      render: (o) => (
        <Link
          href={`/admin/orders/${o.id}`}
          className="font-mono text-xs text-slate-500 hover:text-blue-700"
        >
          {o.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "items",
      header: "Состав",
      mobileFullWidth: true,
      render: (o) =>
        o.items.length === 0 ? (
          <span className="text-slate-400">—</span>
        ) : (
          <div className="space-y-0.5">
            {o.items.map((item, i) => (
              <div key={i} className="text-[13px] text-slate-700">
                {item.title ?? "услуга удалена"}
                {(item.quantity ?? 1) > 1 && (
                  <span className="text-slate-400"> ×{item.quantity}</span>
                )}
                {isAddonChoice(item.addonChoice) && (
                  <span className="ml-1.5 text-[11px] text-slate-400">
                    {ADDON_CHOICE_CART_LABEL[item.addonChoice]}
                  </span>
                )}
              </div>
            ))}
          </div>
        ),
    },
    {
      key: "booster",
      header: "Бустер",
      render: (o) =>
        o.boosterId ? (
          <Link
            href={`/admin/booster/${o.boosterId}`}
            className="whitespace-nowrap text-[13px] text-blue-700 hover:underline"
          >
            {o.boosterName ?? "качер"}
          </Link>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Статус",
      render: (o) => <OrderStatusBadge status={o.status ?? "pending"} />,
    },
    {
      key: "total",
      header: "Сумма",
      align: "right",
      render: (o) => (
        <span className="whitespace-nowrap font-semibold tabular-nums">
          {money(Number(o.totalPrice))}
        </span>
      ),
    },
    {
      key: "date",
      header: "Дата",
      align: "right",
      render: (o) => <span className="whitespace-nowrap text-slate-500">{shortDate(o.createdAt)}</span>,
    },
  ];

  const cartColumns: Column<CartLine>[] = [
    {
      key: "title",
      header: "Позиция",
      mobileFullWidth: true,
      render: (line) => (
        <div>
          <div className="text-[13px] text-slate-700">
            {line.title ?? "услуга удалена"}
            {line.quantity > 1 && <span className="text-slate-400"> ×{line.quantity}</span>}
          </div>
          {isAddonChoice(line.addonChoice) && (
            <div className="text-[11px] text-slate-400">{ADDON_CHOICE_CART_LABEL[line.addonChoice]}</div>
          )}
        </div>
      ),
    },
    {
      key: "total",
      header: "Сумма",
      align: "right",
      render: (line) => <span className="font-semibold tabular-nums">{money(line.lineTotal)}</span>,
    },
  ];

  const promoColumns: Column<PromocodeUse>[] = [
    {
      key: "code",
      header: "Код",
      render: (use) => (
        <span className="font-semibold text-slate-900">
          {use.code ?? "удалён"}
          {use.discountPercent != null && (
            <span className="ml-1.5 font-normal text-slate-500">−{use.discountPercent}%</span>
          )}
        </span>
      ),
    },
    {
      key: "usedAt",
      header: "Когда",
      align: "right",
      render: (use) => (
        <span className="whitespace-nowrap text-slate-500">
          {shortDate(use.usedAt)}
          {use.orderId && (
            <Link
              href={`/admin/orders/${use.orderId}`}
              className="ml-1.5 font-mono text-[11px] text-blue-700 hover:underline"
            >
              {use.orderId.slice(0, 8)}
            </Link>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={user.username} subtitle={user.email} />

      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/users")}
          className="btn-ghost btn-sm btn-icon-only"
          aria-label="Назад к списку"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <span className="text-sm text-slate-500">Все пользователи</span>
      </div>

      <UserIdentityCard
        user={user}
        stats={stats}
        cart={cart}
        cartTotal={cartTotal}
        monthlySpend={monthlySpend}
      />

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* ── left column ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <UserCard
            title={`Заказы · ${orders.length}`}
            right={
              orders.length > 0 && (
                <Link href={`/admin/orders?search=${user.email}`} className="hover:text-blue-700">
                  в общем списке →
                </Link>
              )
            }
            bodyClassName={orders.length ? "p-2" : "p-4"}
          >
            {orders.length === 0 ? (
              <EmptyRow
                action={
                  <Link href={`/admin/orders/new?userId=${user.id}`} className="btn-secondary btn-sm text-xs">
                    Создать вручную
                  </Link>
                }
              >
                Заказов пока нет
              </EmptyRow>
            ) : (
              <DataTable
                columns={orderColumns}
                data={orders}
                getRowKey={(o) => o.id}
                dense
                page={ordersPage}
                {...(orders.length > 10 ? { pageSize: 10 } : {})}
                onPageChange={setOrdersPage}
                onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
              />
            )}
          </UserCard>

          <UserCard title={`Отзывы · ${reviews.length}`}>
            {reviews.length === 0 ? (
              <EmptyRow>Отзывов пока нет</EmptyRow>
            ) : (
              <div className="space-y-2">
                {reviews.map((review: Review) => (
                  <div key={review.id} className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="font-bold text-amber-600">
                        {parseFloat(review.rating).toFixed(1)}★
                      </span>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={
                          review.status === "approved"
                            ? "success"
                            : review.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                        className="text-[11px] font-bold"
                      >
                        <Chip.Label>
                          {review.status === "approved"
                            ? "Одобрен"
                            : review.status === "rejected"
                              ? "Отклонён"
                              : "На модерации"}
                        </Chip.Label>
                      </Chip>
                      <span className="text-slate-400">{shortDate(review.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-slate-700">{review.description}</p>
                  </div>
                ))}
              </div>
            )}
          </UserCard>
        </div>

        {/* ── right column ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <UserCard
            title="Корзина сейчас"
            tone={cart.length ? "warn" : "default"}
            right={
              cart.length ? (
                <span className="font-bold text-amber-700">{money(cartTotal)}</span>
              ) : null
            }
            bodyClassName={cart.length ? "p-2" : "p-4"}
          >
            {cart.length === 0 ? (
              <EmptyRow>Корзина пуста</EmptyRow>
            ) : (
              <>
                {/* Paginated: the biggest live cart in the DB is 20 lines, which
                    would otherwise push the whole right column off screen. */}
                <DataTable
                  columns={cartColumns}
                  data={cart}
                  getRowKey={(line) => line.id}
                  dense
                  page={cartPage}
                  {...(cart.length > 8 ? { pageSize: 8 } : {})}
                  onPageChange={setCartPage}
                />
                {cartUpdatedAt && (
                  <p className="px-2 pt-2 text-[11px] text-slate-400">
                    последнее добавление {shortDate(cartUpdatedAt)}
                  </p>
                )}
              </>
            )}
          </UserCard>

          <UserCard
            title={`Промокоды · ${promocodeUses.length}`}
            bodyClassName={promocodeUses.length ? "p-2" : "p-4"}
          >
            {promocodeUses.length === 0 ? (
              <EmptyRow>Промокоды не применялись</EmptyRow>
            ) : (
              <DataTable
                columns={promoColumns}
                data={promocodeUses}
                getRowKey={(use) => use.id}
                dense
              />
            )}
          </UserCard>

          {topServices.length > 0 && (
            <UserCard title="Чаще всего покупает">
              <div className="space-y-1.5">
                {topServices.map((service, index) => (
                  <div key={service.serviceId} className="flex items-center gap-2.5 text-[13px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{service.title}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                      ×{service.count}
                    </span>
                  </div>
                ))}
              </div>
            </UserCard>
          )}

          <AccessCard
            user={user}
            onRoleChanged={(role) =>
              setData((prev) => (prev ? { ...prev, user: { ...prev.user, role } } : prev))
            }
          />
        </div>
      </div>
    </div>
  );
}
