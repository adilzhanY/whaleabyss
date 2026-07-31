"use client";

import { useState, useEffect, useMemo } from "react";
import { Chip } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import CustomSearchField from "@/components/CustomSearchField";
import CustomSelect from "@/components/CustomSelect";
import DataTable, { type Column } from "../_components/DataTable";
import PageHeader from "../_components/PageHeader";
import CopyableText from "../_components/CopyableText";
import CopyableTelegram from "../_components/CopyableTelegram";
import { confirmDialog } from "@/store/useConfirm";

const BOOSTERS_PER_PAGE = 10;

interface Booster {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  telegramUsername: string | null;
  inn: string | null;
  payoutDetails: string | null;
  commissionPercent: number;
  balance: string;
  status: "active" | "inactive";
  note: string | null;
  startDate: string | null;
  createdAt: string;
  completedOrders: number;
}

export default function BoostersPage() {
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    fetchBoosters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, statusFilter, debouncedSearch]);

  const fetchBoosters = async () => {
    try {
      const res = await fetch("/api/admin/boosters");
      if (res.ok) setBoosters(await res.json());
    } catch (error) {
      console.error("Failed to fetch boosters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      title: "Удалить этого качера?",
      description: "История заказов не затрагивается.",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/boosters/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBoosters((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert("Ошибка при удалении");
      }
    } catch {
      alert("Ошибка при удалении");
    }
  };

  const filteredBoosters = useMemo(() => {
    let result = [...boosters];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (b) =>
          b.id.toLowerCase().includes(query) ||
          `${b.firstName} ${b.lastName}`.toLowerCase().includes(query) ||
          b.telegramUsername?.toLowerCase().includes(query) ||
          b.inn?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [boosters, sortBy, statusFilter, debouncedSearch]);

  const columns: Column<Booster>[] = [
    {
      key: "index",
      header: "№",
      width: "w-12",
      hideOnMobile: true,
      render: (_b, index) => <span className="text-slate-600">{index + 1}</span>,
    },
    {
      // Same treatment as /admin/users: copyable, not a link — the whole row
      // navigates, so a second click target inside it is just noise.
      key: "id",
      header: "ID",
      width: "w-32",
      render: (b) => (
        <div onClick={(e) => e.stopPropagation()} className="inline-flex">
          <CopyableText value={b.id} className="text-xs text-slate-500">
            <span className="font-mono">{b.id.slice(0, 8)}...</span>
          </CopyableText>
        </div>
      ),
    },
    {
      key: "name",
      header: "Имя",
      render: (b) => (
        <div className="min-w-0">
          <div className="font-medium text-slate-700 truncate">
            {b.firstName} {b.lastName}
          </div>
          {b.note && (
            <div className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{b.note}</div>
          )}
        </div>
      ),
    },
    {
      key: "telegram",
      header: "Telegram",
      render: (b) => (
        <div onClick={(e) => e.stopPropagation()} className="inline-flex">
          <CopyableTelegram username={b.telegramUsername} />
        </div>
      ),
    },
    {
      key: "commission",
      header: "Комиссия",
      render: (b) => (
        <span className="text-sm font-semibold text-slate-700">
          {b.commissionPercent}%
        </span>
      ),
    },
    {
      key: "balance",
      header: "Баланс",
      render: (b) => (
        <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
          {Number(b.balance).toLocaleString("ru-RU")} ₽
        </span>
      ),
    },
    {
      key: "completed",
      header: "Завершено",
      render: (b) => (
        <span className="text-sm text-slate-600">{b.completedOrders}</span>
      ),
    },
    {
      key: "startDate",
      header: "Работает с",
      width: "w-32",
      render: (b) => (
        <span className="whitespace-nowrap text-xs text-slate-500">
          {b.startDate ? new Date(b.startDate).toLocaleDateString("en-GB") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (b) => (
        <Chip
          size="sm"
          color={b.status === "active" ? "success" : "default"}
          variant={b.status === "active" ? "soft" : "secondary"}
          className="text-[11px] font-bold"
        >
          <Chip.Label>{b.status === "active" ? "Активен" : "Неактивен"}</Chip.Label>
        </Chip>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "Действия",
      render: (b) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleDelete(b.id)}
            title="Удалить"
            className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <PageHeader
        subtitle="Реестр исполнителей. Добавляйте и редактируйте вручную — вход в систему им не нужен."
        actions={
          <Link
            href="/admin/boosters/new"
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4 shrink-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Добавить качера</span>
          </Link>
        }
      />

      {boosters.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-4">Качеров пока нет</p>
          <Link
            href="/admin/boosters/new"
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4"
          >
            <Plus className="w-4 h-4" />
            Добавить первого
          </Link>
        </div>
      ) : (
        <>
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
                  options={[
                    { value: "all", label: "Все" },
                    { value: "active", label: "Активен" },
                    { value: "inactive", label: "Неактивен" },
                  ]}
                />
              </div>

              <CustomSearchField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Поиск по ID, имени, Telegram, ИНН..."
                className="flex-1 min-w-[220px]"
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredBoosters}
            getRowKey={(b) => b.id}
            emptyMessage="Качеры не найдены"
            onRowClick={(b) => {
              window.location.href = `/admin/booster/${b.id}`;
            }}
            page={page}
            pageSize={BOOSTERS_PER_PAGE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
