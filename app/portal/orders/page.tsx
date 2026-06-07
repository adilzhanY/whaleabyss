"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import Input from "@/components/Input";
import CustomSelect from "@/components/CustomSelect";
import PortalOrderCard, { type PortalOrder } from "../_components/PortalOrderCard";

/**
 * /portal/orders — the booster's PAST orders (everything not in work), with
 * the same filter+search pattern as the admin list pages: CustomSelect
 * dropdowns + a debounced Input with a Search icon. Active orders live on
 * the dashboard.
 */

export default function PortalPastOrdersPage() {
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/orders");
        if (res.ok) setOrders(await res.json());
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pastOrders = useMemo(() => {
    let list = orders.filter((o) => o.status !== "in_progress");

    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(query) ||
          o.items.some((it) => (it.title ?? "").toLowerCase().includes(query)) ||
          (o.userNotes ?? "").toLowerCase().includes(query)
      );
    }

    return [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? db - da : da - db;
    });
  }, [orders, sortBy, statusFilter, debouncedSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1
          className="text-3xl font-black text-blue-950"
          style={{ fontFamily: "var(--font-primary), sans-serif" }}
        >
          Прошлые заказы
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Все завершённые и отменённые заказы. Активные — на дашборде.
        </p>
      </div>

      {/* Filters — same pattern as admin list pages */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
              Статус
            </label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full"
              buttonClassName="bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm"
              options={[
                { value: "all", label: "Все" },
                { value: "completed", label: "Выполнен" },
                { value: "cancelled", label: "Отменён" },
                { value: "refunded", label: "Возврат" },
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
            placeholder="Поиск по ID заказа, услуге, заметкам..."
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {pastOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          Заказы не найдены
        </div>
      ) : (
        <div className="space-y-4">
          {pastOrders.map((o) => (
            <PortalOrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
