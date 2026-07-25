"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import Link from "next/link";
import { SearchField } from "@heroui/react";
import TelegramIcon from "@/components/TelegramIcon";
import CustomSelect from "@/components/CustomSelect";
import DataTable, { type Column } from "../_components/DataTable";
import PageHeader from "../_components/PageHeader";

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

  const toggleStatus = async (b: Booster) => {
    const next = b.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/boosters/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setBoosters((prev) =>
          prev.map((x) => (x.id === b.id ? { ...x, status: next } : x))
        );
      } else {
        alert("Не удалось изменить статус");
      }
    } catch {
      alert("Не удалось изменить статус");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этого качера? История заказов не затрагивается.")) return;
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
      key: "id",
      header: "ID",
      render: (b) => (
        <Link
          href={`/admin/booster/${b.id}`}
          className="font-mono text-xs text-indigo-600 hover:underline"
        >
          {b.id.slice(0, 8)}...
        </Link>
      ),
    },
    {
      key: "name",
      header: "Имя",
      render: (b) => (
        <div>
          <Link
            href={`/admin/booster/${b.id}`}
            className="font-semibold text-blue-950 hover:text-indigo-600"
          >
            {b.firstName} {b.lastName}
          </Link>
          {b.note && (
            <div className="text-xs text-slate-400 mt-0.5 max-w-[220px] truncate">
              {b.note}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "telegram",
      header: "Telegram",
      render: (b) =>
        b.telegramUsername ? (
          <a
            href={`https://t.me/${b.telegramUsername.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
          >
            <TelegramIcon className="w-3.5 h-3.5" />
            {b.telegramUsername}
          </a>
        ) : (
          <span className="text-slate-300">—</span>
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
      key: "status",
      header: "Статус",
      render: (b) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
            b.status === "active"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {b.status === "active" ? "Активен" : "Неактивен"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "Действия",
      render: (b) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => toggleStatus(b)}
            title={b.status === "active" ? "Деактивировать" : "Активировать"}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <Power className="w-4 h-4" />
          </button>
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
                    { value: "active", label: "Активен" },
                    { value: "inactive", label: "Неактивен" },
                  ]}
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
                  <SearchField.Input placeholder="Поиск по ID, имени, Telegram, ИНН..." />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredBoosters}
            getRowKey={(b) => b.id}
            emptyMessage="Качеры не найдены"
            page={page}
            pageSize={BOOSTERS_PER_PAGE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
