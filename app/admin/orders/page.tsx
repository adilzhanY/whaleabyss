"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SearchField } from "@heroui/react";
import {
  ORDER_STATUSES,
  orderStatusLabel,
} from "../_components/OrderStatusBadge";
import CustomSelect from "@/components/CustomSelect";
import DataTable from "../_components/DataTable";
import { buildOrderColumns, type OrderRow } from "../_components/orderColumns";
import { isLessonOrder, LESSON_ROW_CLASS } from "../_components/lessonOrders";
import PageHeader from "../_components/PageHeader";
import OrderDateRangePicker from "../_components/OrderDateRangePicker";

type Order = OrderRow;

const ORDERS_PER_PAGE = 10;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Guards against out-of-order responses: only the latest request's result wins.
  const reqIdRef = useRef(0);

  // Re-fetch from the server on any page/filter/search change — SQL does all the
  // filtering, sorting and slicing, so the client only ever holds one page.
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, statusFilter, startDate, endDate, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to the first page whenever the filtered result set changes, so you
  // never land on a now-empty page.
  useEffect(() => {
    setPage(1);
  }, [sortBy, startDate, endDate, statusFilter, debouncedSearch]);

  const onOrderChange = (id: string, patch: Partial<Order>) =>
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );

  const fetchOrders = async () => {
    const reqId = ++reqIdRef.current;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ORDERS_PER_PAGE),
        sort: sortBy,
        status: statusFilter,
      });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (reqId !== reqIdRef.current) return; // superseded by a newer request
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (error) {
      if (reqId === reqIdRef.current) console.error("Failed to fetch orders:", error);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  };

  const columns = useMemo(
    () => buildOrderColumns({ onOrderChange, showIndex: true }),
    []
  );

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <PageHeader
        subtitle={`Всего заказов: ${total}`}
        actions={
          <Link
            href="/admin/orders/new"
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4 !rounded-full shrink-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Добавить вручную</span>
          </Link>
        }
      />

      {/* Filters — single row on desktop, wrapping down to stacked on mobile. */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 pt-1 pb-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-44">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Сортировка
            </label>
            <CustomSelect
              value={sortBy}
              onChange={(v) => setSortBy(v as "newest" | "oldest")}
              className="w-full"
              buttonClassName="bg-slate-100 px-4 h-8 rounded-2xl text-sm text-slate-700"
              menuClassName="bg-white rounded-2xl shadow-xl shadow-slate-900/10"
              optionClassName="rounded-2xl"
              options={[
                { value: "newest", label: "Сначала новые" },
                { value: "oldest", label: "Сначала старые" },
              ]}
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Статус
            </label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full"
              buttonClassName="bg-slate-100 px-4 h-8 rounded-2xl text-sm text-slate-700"
              menuClassName="bg-white rounded-2xl shadow-xl shadow-slate-900/10"
              optionClassName="rounded-2xl"
              options={[
                { value: "all", label: "Все" },
                ...ORDER_STATUSES.map((status) => ({
                  value: status,
                  label: orderStatusLabel(status),
                })),
              ]}
            />
          </div>

          <div className="w-full sm:w-72">
            <OrderDateRangePicker
              label="Период"
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>

          <SearchField
            aria-label="Поиск"
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1 min-w-[220px]"
          >
            <SearchField.Group className="w-full">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Поиск по ID, имени, email..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={orders}
        totalCount={total}
        getRowKey={(o) => o.id}
        rowClassName={(o) => (isLessonOrder(o) ? LESSON_ROW_CLASS : "")}
        loading={loading && orders.length === 0}
        emptyMessage="Заказы не найдены"
        page={page}
        pageSize={ORDERS_PER_PAGE}
        onPageChange={setPage}
        dense
      />
    </div>
  );
}
