"use client";

import { useSession } from "next-auth/react";
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Clock, Search, FilterX, ChevronRight } from "lucide-react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import OrderCard from "@/components/OrderCard";
import { ORDER_STATUSES, orderStatusLabel } from "@/lib/orderStatus";

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

  useEffect(() => {
    if (status === "unauthenticated") {
      setAuthOpen(true);
      setLoading(false);
    } else if (session?.user) {
      fetchOrders();
    }
  }, [session, status]);

  const fetchOrders = async () => {
    setLoading(true);
    fetch("/api/user/orders")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

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

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-900 transition-colors">Главная</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-blue-300">История заказов</span>
        </div>

        <h1 className="text-3xl font-black text-blue-950 mb-8" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
          Мои заказы
        </h1>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по ID или названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:font-normal"
            />
          </div>

          <div className="flex gap-4 flex-col sm:flex-row">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="all">Любой статус</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {orderStatusLabel(s)}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="all">За все время</option>
              <option value="week">За эту неделю</option>
              <option value="month">За последний месяц</option>
            </select>

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
