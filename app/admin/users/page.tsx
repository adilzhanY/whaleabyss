"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import Input from "@/components/Input";
import DataTable, { type Column } from "../_components/DataTable";
import PageHeader from "../_components/PageHeader";
import CopyableText from "../_components/CopyableText";
import CopyableTelegram from "../_components/CopyableTelegram";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  telegramUsername: string | null;
  adventureRank: number | null;
  createdAt: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Only the latest request's result is applied (guards out-of-order responses).
  const reqIdRef = useRef(0);

  // Re-fetch from the server on any page/filter/search change — SQL does all the
  // filtering, sorting and slicing, so the client only ever holds one page.
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, roleFilter, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, roleFilter, debouncedSearch]);

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

  const getRoleBadge = (role: string) => {
    const styles = {
      user: "bg-blue-100 text-blue-700 border-blue-200",
      admin: "bg-purple-100 text-purple-700 border-purple-200",
      booster: "bg-green-100 text-green-700 border-green-200",
    };
    const labels = {
      user: "Пользователь",
      admin: "Администратор",
      booster: "Бустер",
    };

    return (
      <span
        className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
          styles[role as keyof typeof styles] || styles.user
        }`}
      >
        {labels[role as keyof typeof labels] || role}
      </span>
    );
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
      render: (u) => getRoleBadge(u.role),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader subtitle={`Всего пользователей: ${total}`} />

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
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
              Роль
            </label>
            <CustomSelect
              value={roleFilter}
              onChange={setRoleFilter}
              className="w-full"
              buttonClassName="bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm"
              options={[
                { value: "all", label: "Все" },
                { value: "user", label: "Пользователь" },
                { value: "admin", label: "Администратор" },
                { value: "booster", label: "Бустер" },
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
            placeholder="Поиск по ID, имени, email, Telegram..."
            className="pl-10 text-sm"
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
