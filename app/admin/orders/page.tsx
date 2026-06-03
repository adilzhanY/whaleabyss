"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import {
  ORDER_STATUSES,
  orderStatusLabel,
} from "../_components/OrderStatusBadge";
import CustomSelect from "@/components/CustomSelect";
import Input from "@/components/Input";
import DataTable from "../_components/DataTable";
import { buildOrderColumns, type OrderRow } from "../_components/orderColumns";

type Order = OrderRow;

const ORDERS_PER_PAGE = 10;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

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
    try {
      setLoading(true);
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      result = result.filter((o) => new Date(o.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.createdAt) <= end);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(query) ||
          o.paymentId?.toLowerCase().includes(query) ||
          o.username?.toLowerCase().includes(query) ||
          o.email?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [orders, sortBy, startDate, endDate, statusFilter, debouncedSearch]);

  const columns = useMemo(
    () => buildOrderColumns({ onOrderChange, showIndex: true }),
    []
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6" style={{ fontFamily: "Onest, sans-serif" }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Заказы</h1>
          <p className="text-sm text-slate-600 mt-1">Всего заказов: {orders.length}</p>
        </div>
        <Link
          href="/admin/orders/new"
          className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-4 !rounded-full shrink-0"
        >
          <Plus className="w-4 h-4" />
          Добавить вручную
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Сортировка
            </label>
            <CustomSelect
              value={sortBy}
              onChange={(v) => setSortBy(v as "newest" | "oldest")}
              className="w-full"
              buttonClassName="bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm"
              options={[
                { value: "newest", label: "Сначала новые" },
                { value: "oldest", label: "Сначала старые" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Дата от
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Дата до
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Статус
            </label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full"
              buttonClassName="bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm"
              options={[
                { value: "all", label: "Все" },
                ...ORDER_STATUSES.map((status) => ({
                  value: status,
                  label: orderStatusLabel(status),
                })),
              ]}
            />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ID заказа, ID платежа, имени, email..."
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        getRowKey={(o) => o.id}
        loading={loading}
        emptyMessage="Заказы не найдены"
        page={page}
        pageSize={ORDERS_PER_PAGE}
        onPageChange={setPage}
      />
    </div>
  );
}
