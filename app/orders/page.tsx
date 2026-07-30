"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Clock, Search, FilterX } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import OrderCard from "@/components/OrderCard";
import { ORDER_STATUSES, orderStatusLabel } from "@/lib/orderStatus";
import Breadcrumb from "@/components/Breadcrumb";
import CustomSelect from "@/components/CustomSelect";
import CustomSearchField from "@/components/CustomSearchField";

interface OrderItem {
  serviceId?: string;
  serviceTitle?: string;
  serviceImage?: string;
  [key: string]: unknown;
}

interface OrderData {
  id: string;
  status: string;
  createdAt: string;
  totalAmount?: number | string;
  items?: OrderItem[];
  [key: string]: unknown;
}

export default function OrdersPage() {
  const { data: session, status } = useSession();

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // `silent` skips the full-page loading spinner — used for background refreshes
  // so polling doesn't flash the list away under the customer.
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // no-store: never let the browser/bfcache serve a stale snapshot, so a
      // status change (e.g. booster toggling «на аккаунте») is always reflected.
      const res = await fetch("/api/user/orders", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      setAuthOpen(true);
      setLoading(false);
    } else if (session?.user) {
      fetchOrders();
    }
  }, [session, status, fetchOrders]);

  // Only orders in a non-terminal state can still change server-side (booster
  // assignment, «на аккаунте» toggle, completion). If the customer is only
  // viewing finished history, we never poll — zero extra requests.
  const hasActiveOrder = orders.some((o) =>
    ["pending", "paid", "in_progress"].includes(o.status)
  );

  // Keep an actively-watched order fresh without a persistent connection:
  // refetch on tab refocus (feels instant) + a light poll, both paused while
  // the tab is hidden. Bounded to ~the moments the customer actually cares.
  useEffect(() => {
    if (status !== "authenticated" || !hasActiveOrder) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") fetchOrders(true);
    };

    document.addEventListener("visibilitychange", refreshIfVisible);
    const interval = setInterval(refreshIfVisible, 20000);

    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      clearInterval(interval);
    };
  }, [status, hasActiveOrder, fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    // Status Filter
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== "all") {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (orderDate < weekAgo) return false;
      }
      if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        if (orderDate < monthAgo) return false;
      }
    }

    // Search query (order id or service names)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesId = order.id.toLowerCase().includes(q);
      const matchesService = (order.items || []).some((item: Record<string, unknown>) =>
        ((item.serviceTitle as string) || "").toLowerCase().includes(q)
      );
      if (!matchesId && !matchesService) return false;
    }

    return true;
  });

  if (status === "loading") {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center">
        <Clock className="w-8 h-8 animate-spin text-slate-300 mb-4" />
        <span>Загрузка истории заказов...</span>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-20">
        <Breadcrumb />

        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-blue-950 mb-4" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
            Мои заказы
          </h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-8">
          <CustomSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Поиск по ID или названию..."
            fieldSize="md"
            className="flex-1"
          />

          <div className="flex gap-4 flex-col sm:flex-row">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full sm:w-52"
              fieldSize="md"
              options={[
                { value: "all", label: "Любой статус" },
                ...ORDER_STATUSES.map((s) => ({ value: s, label: orderStatusLabel(s) })),
              ]}
            />

            <CustomSelect
              value={dateFilter}
              onChange={setDateFilter}
              className="w-full sm:w-52"
              fieldSize="md"
              options={[
                { value: "all", label: "За все время" },
                { value: "week", label: "За эту неделю" },
                { value: "month", label: "За последний месяц" },
              ]}
            />

            {(statusFilter !== "all" || dateFilter !== "all" || searchQuery !== "") && (
              <button
                onClick={() => { setStatusFilter("all"); setDateFilter("all"); setSearchQuery(""); }}
                className="px-4 py-3 flex items-center justify-center gap-2 text-slate-500 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl text-sm font-semibold transition-all shrink-0"
              >
                <FilterX className="w-4 h-4" />
                <span className="hidden sm:inline">Сбросить</span>
              </button>
            )}
          </div>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center">
            <Clock className="w-8 h-8 animate-spin text-slate-300 mb-4" />
            <span>Загрузка истории заказов...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 bg-white rounded-3xl border border-slate-100 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-lg font-bold text-slate-700">Ничего не найдено</p>
            <p className="text-slate-500 text-sm mt-2 max-w-sm">Попробуйте изменить параметры фильтрации или оформите новый заказ в каталоге.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOrders.map((order) => (
              <div key={order.id}>
                <OrderCard
                  order={order}
                  isGrayscale={["completed", "cancelled", "refunded"].includes(order.status)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
