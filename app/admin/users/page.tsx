"use client";

import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  telegramUsername: string | null;
  createdAt: string;
}

const USERS_PER_PAGE = 10;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (u) =>
          u.id.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.telegramUsername?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [users, sortBy, roleFilter, debouncedSearch]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, page]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

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

  return (
    <div className="p-6" style={{ fontFamily: "Onest, sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Управление пользователями</h1>
        <p className="text-sm text-slate-600 mt-1">Всего пользователей: {users.length}</p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Сортировка
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="newest">Сначала новые</option>
              <option value="oldest">Сначала старые</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Роль
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="all">Все</option>
              <option value="user">Пользователь</option>
              <option value="admin">Администратор</option>
              <option value="booster">Бустер</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ID, имени, email, Telegram..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500">Пользователи не найдены</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-12">№</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-32">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Имя пользователя</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Telegram</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-32">Дата регистрации</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-32">Роль</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, index) => {
                  const globalIndex = (page - 1) * USERS_PER_PAGE + index + 1;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => window.location.href = `/admin/users/${user.id}`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-600">{globalIndex}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {user.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                        {user.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {user.telegramUsername || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(user.createdAt).toLocaleString("ru-RU", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {getRoleBadge(user.role)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
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
        </>
      )}
    </div>
  );
}
