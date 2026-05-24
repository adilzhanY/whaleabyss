"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import OrderStatusBadge, {
  ORDER_STATUSES,
  orderStatusLabel,
} from "../_components/OrderStatusBadge";
import CustomSelect from "@/components/CustomSelect";

interface Order {
  id: string;
  userId: string | null;
  status: string;
  totalPrice: string;
  createdAt: string;
  paymentId: string | null;
  username: string | null;
  email: string | null;
}

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

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, page]);

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto space-y-6" style={{ fontFamily: "Onest, sans-serif" }}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Заказы</h1>
        <p className="text-sm text-slate-600 mt-1">Всего заказов: {orders.length}</p>
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
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Дата до
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
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
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ID заказа, ID платежа, имени, email..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500">Заказы не найдены</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="text-left font-medium px-4 py-3 w-12">№</th>
                  <th className="text-left font-medium px-4 py-3">ID заказа</th>
                  <th className="text-left font-medium px-4 py-3">ID клиента</th>
                  <th className="text-left font-medium px-4 py-3">Клиент</th>
                  <th className="text-left font-medium px-4 py-3">Статус</th>
                  <th className="text-right font-medium px-4 py-3">Сумма</th>
                  <th className="text-right font-medium px-4 py-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((o, index) => {
                  const globalIndex = (page - 1) * ORDERS_PER_PAGE + index + 1;
                  return (
                    <tr
                      key={o.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-600">{globalIndex}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="hover:text-indigo-600"
                        >
                          {o.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {o.userId ? `${o.userId.slice(0, 8)}...` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {o.username ?? "— guest —"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {o.email ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={o.status ?? "pending"} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(o.totalPrice).toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleString("ru-RU", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Страница {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <button
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
                Назад
              </button>
            )}
            {page < totalPages && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Следующая
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
