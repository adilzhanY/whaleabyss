"use client";

import { useMemo, useState } from "react";
import DataTable from "./DataTable";
import { buildOrderColumns, type OrderRow } from "./orderColumns";

/**
 * Dashboard "Последние заказы" table. Thin client wrapper so the server-rendered
 * dashboard can use the very same {@link DataTable} + order columns as the Orders
 * page, with the interactive status/booster cells kept in local state.
 */
export default function RecentOrdersTable({
  initialOrders,
}: {
  initialOrders: OrderRow[];
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);

  const onOrderChange = (id: string, patch: Partial<OrderRow>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const columns = useMemo(
    () => buildOrderColumns({ onOrderChange, showIndex: false }),
    []
  );

  return (
    <DataTable
      columns={columns}
      data={orders}
      getRowKey={(o) => o.id}
      emptyMessage="Пока нет заказов."
    />
  );
}
