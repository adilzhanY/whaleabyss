"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import CustomSearchField from "@/components/CustomSearchField";
import CustomSelect from "@/components/CustomSelect";
import DataTable, { type Column } from "../../admin/_components/DataTable";
import OrderItemsCell from "../../admin/_components/OrderItemsCell";
import OrderStatusBadge from "../../admin/_components/OrderStatusBadge";
import CopyableText from "../../admin/_components/CopyableText";
import { rub, type PortalOrder } from "../_components/PortalOrderCard";

/**
 * /portal/orders — the booster's PAST orders (everything not in work) in the
 * same DataTable as /admin/orders, so both sides of the business read the
 * same layout. Three deliberate differences from the admin table:
 *  - rows don't navigate anywhere (there is no order detail page in the portal);
 *  - «Клиент» is the plain contact notes, no avatar and no profile link;
 *  - «Сумма» is the booster's cut, never the order total, and the status is a
 *    read-only badge, not the admin's status switcher.
 * Active orders live on the dashboard.
 */

export default function PortalPastOrdersPage() {
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Back to page 1 whenever the visible set changes — page 4 of a filter that
  // now has one page would render empty.
  useEffect(() => {
    setPage(1);
  }, [sortBy, statusFilter, debouncedSearch]);

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
    <div className="max-w-7xl mx-auto space-y-6">
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
              fieldSize="md"
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
              fieldSize="md"
              options={[
                { value: "all", label: "Все" },
                { value: "completed", label: "Выполнен" },
                { value: "cancelled", label: "Отменён" },
                { value: "refunded", label: "Возврат" },
              ]}
            />
          </div>
        </div>

        <CustomSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Поиск по ID заказа, услуге, заметкам..."
          fieldSize="md"
        />
      </div>

      <DataTable
        data={pastOrders}
        columns={columns}
        getRowKey={(o) => o.id}
        emptyMessage="Заказы не найдены"
        page={page}
        pageSize={10}
        onPageChange={setPage}
      />
    </div>
  );
}

/** Same table vocabulary as buildOrderColumns, minus what a booster must not
 *  see (order totals, other customers' profiles) or cannot do (change status). */
const columns: Column<PortalOrder>[] = [
  {
    key: "index",
    header: "№",
    width: "w-8",
    hideOnMobile: true,
    render: (_o, index) => <span className="text-slate-600">{index + 1}</span>,
  },
  {
    key: "id",
    header: "ID заказа",
    mobileLabel: "ID заказа",
    // Short id on screen, the FULL id on the clipboard — it goes into support
    // chats and admin lookups, where the prefix alone is not enough.
    render: (o) => (
      <CopyableText value={o.id} className="font-mono text-xs text-slate-500">
        <span className="truncate">{o.id.slice(0, 8)}...</span>
      </CopyableText>
    ),
  },
  {
    key: "items",
    header: "Позиции",
    mobileLabel: "Позиции",
    width: "w-44",
    mobileFullWidth: true,
    render: (o) => (
      <OrderItemsCell
        items={o.items.map((it) => ({
          title: it.title,
          quantity: it.quantity,
          startDate: it.startDate ?? null,
          endDate: it.endDate ?? null,
        }))}
      />
    ),
  },
  {
    key: "customer",
    header: "ID клиента",
    mobileLabel: "ID клиента",
    width: "w-28",
    // Only the account id — no contacts, no avatar, no profile link. Copyable
    // in full, so the booster can hand it to the admin when asking about a
    // client.
    render: (o) =>
      o.userId ? (
        <CopyableText value={o.userId} className="font-mono text-xs text-slate-500">
          <span className="truncate">{o.userId.slice(0, 8)}...</span>
        </CopyableText>
      ) : (
        <span className="text-slate-300">—</span>
      ),
  },
  {
    key: "status",
    header: "Статус",
    mobileLabel: "Статус",
    width: "w-20",
    render: (o) => <OrderStatusBadge status={o.status} />,
  },
  {
    key: "earning",
    header: "Вы получите",
    mobileLabel: "Вы получите",
    align: "right",
    render: (o) => (
      <div className="whitespace-nowrap">
        <span className="font-medium">{rub(o.earning)}</span>
        {o.earningCredited && (
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            начислено
          </div>
        )}
      </div>
    ),
  },
  {
    key: "date",
    header: "Дата",
    mobileLabel: "Дата",
    align: "right",
    render: (o) => (
      <span className="whitespace-nowrap text-slate-500">
        {new Date(o.createdAt).toLocaleString("ru-RU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    ),
  },
];
