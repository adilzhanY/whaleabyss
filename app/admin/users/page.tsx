"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import CustomSearchField from "@/components/CustomSearchField";
import CustomSelect from "@/components/CustomSelect";
import DataTable, { type Column } from "../_components/DataTable";
import PageHeader from "../_components/PageHeader";
import CopyableText from "../_components/CopyableText";
import CopyableTelegram from "../_components/CopyableTelegram";
import UserRoleChip from "../_components/UserRoleChip";
import CustomDateRangePicker from "@/components/CustomDateRangePicker";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  telegramUsername: string | null;
  adventureRank: number | null;
  createdAt: string;
  /** Orders that count as money spent (everything but pending/cancelled). */
  orderCount: number;
  /** Same sum the user card shows, as a decimal string from Postgres. */
  totalSpent: string;
}

const USERS_PER_PAGE = 10;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Only the latest request's result is applied (guards out-of-order responses).
  const reqIdRef = useRef(0);

  // Re-fetch from the server on any page/filter/search change — SQL does all the
  // filtering, sorting and slicing, so the client only ever holds one page.
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, roleFilter, startDate, endDate, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, roleFilter, startDate, endDate, debouncedSearch]);

  const fetchUsers = async () => {
    const reqId = ++reqIdRef.current;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(USERS_PER_PAGE),
        sort: sortBy,
        role: roleFilter,
      });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (reqId !== reqIdRef.current) return; // superseded by a newer request
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (error) {
      if (reqId === reqIdRef.current) console.error("Failed to fetch users:", error);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: "index",
      header: "№",
      width: "w-12",
      hideOnMobile: true,
      render: (_u, index) => <span className="text-slate-600">{index + 1}</span>,
    },
    {
      key: "id",
      header: "ID",
      width: "w-32",
      render: (u) => (
        <div onClick={(e) => e.stopPropagation()} className="inline-flex">
          <CopyableText value={u.id} className="text-xs text-slate-500">
            <span className="font-mono">{u.id.slice(0, 8)}...</span>
          </CopyableText>
        </div>
      ),
    },
    {
      key: "user",
      header: "Пользователь",
      render: (u) => (
        <div className="flex items-center gap-3 min-w-0">
          {u.avatarUrl ? (
            <Image
              src={u.avatarUrl}
              alt={u.username}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm font-bold uppercase select-none text-[#1e3a8a]">
              {u.username?.charAt(0) || "?"}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-slate-700 font-medium truncate">{u.username}</div>
            <div className="text-xs text-slate-500 truncate">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "telegram",
      header: "Telegram",
      render: (u) => (
        <div onClick={(e) => e.stopPropagation()} className="inline-flex">
          <CopyableTelegram username={u.telegramUsername} />
        </div>
      ),
    },
    {
      key: "adventureRank",
      header: "Ранг",
      width: "w-24",
      hideOnMobile: true,
      render: (u) => (
        <span className="text-slate-600">{u.adventureRank ?? "—"}</span>
      ),
    },
    {
      key: "orderCount",
      header: "Заказов",
      width: "w-24",
      align: "right",
      mobileLabel: "Заказов",
      render: (u) =>
        u.orderCount > 0 ? (
          <span className="font-medium tabular-nums">{u.orderCount}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "totalSpent",
      header: "Потрачено",
      width: "w-32",
      align: "right",
      mobileLabel: "Потрачено",
      render: (u) => {
        const spent = Number(u.totalSpent);
        return spent > 0 ? (
          <span className="font-medium whitespace-nowrap tabular-nums">
            {spent.toLocaleString("ru-RU")} ₽
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Дата",
      width: "w-32",
      render: (u) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(u.createdAt).toLocaleDateString("en-GB")}
        </span>
      ),
    },
    {
      key: "role",
      header: "Роль",
      width: "w-32",
      render: (u) => <UserRoleChip role={u.role} />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader subtitle={`Всего пользователей: ${total}`} />

      {/* Filters — single row on desktop, wrapping down to stacked on mobile. */}
      <div className="mb-3 bg-white rounded-xl border border-slate-200 px-4 pt-1 pb-3">
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
              Роль
            </label>
            <CustomSelect
              value={roleFilter}
              onChange={setRoleFilter}
              className="w-full"
              options={[
                { value: "all", label: "Все" },
                { value: "user", label: "Пользователь" },
                { value: "admin", label: "Администратор" },
                { value: "booster", label: "Бустер" },
              ]}
            />
          </div>

          <div className="w-full sm:w-72">
            <CustomDateRangePicker
              label="Период регистрации"
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>

          <CustomSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Поиск по ID, имени, email..."
            className="flex-1 min-w-[220px]"
          />
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={users}
        totalCount={total}
        getRowKey={(u) => u.id}
        loading={loading && users.length === 0}
        emptyMessage="Пользователи не найдены"
        onRowClick={(u) => {
          window.location.href = `/admin/users/${u.id}`;
        }}
        page={page}
        pageSize={USERS_PER_PAGE}
        onPageChange={setPage}
      />
    </div>
  );
}
