"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import DataTable from "../_components/DataTable";
import { buildOrderColumns, type OrderRow } from "../_components/orderColumns";

const PER_PAGE = 10;

/**
 * Test orders (`orders.isTestPayment = true`) — the only place they are shown.
 *
 * Built from the SAME `buildOrderColumns` as /admin/orders, so status changes,
 * booster assignment and the «на акке» toggle behave identically: they all go
 * through `PATCH /api/admin/orders/[id]`, which doesn't care that the order is
 * a test one. That is deliberate — the point of a test order is to walk it
 * through the real lifecycle.
 */
export default function TestOrdersTable() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/testing/orders", { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Failed to fetch test orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onOrderChange = (id: string, patch: Partial<OrderRow>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const columns = useMemo(
    () => buildOrderColumns({ onOrderChange, showIndex: true }),
    []
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <FlaskConical className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Тестовые заказы</h2>
            <p className="text-sm text-slate-500">
              Созданы без оплаты. Не попадают ни в «Заказы», ни в дашборд, ни в Telegram,
              ни в баланс качеров — но клиент видит их как обычный заказ.
            </p>
          </div>
        </div>
        <span className="text-sm text-slate-500">Всего: {orders.length}</span>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        getRowKey={(o) => o.id}
        loading={loading && orders.length === 0}
        emptyMessage="Тестовых заказов пока нет"
        onRowClick={(o) => {
          window.location.href = `/admin/orders/${o.id}`;
        }}
        page={page}
        {...(orders.length > PER_PAGE ? { pageSize: PER_PAGE } : {})}
        onPageChange={setPage}
        dense
      />
    </section>
  );
}
