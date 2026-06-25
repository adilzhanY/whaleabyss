"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Trash2, Search, Star, Plus } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import Input from "@/components/Input";
import DataTable, { type Column } from "../_components/DataTable";
import ReviewStatusCell from "../_components/ReviewStatusCell";

interface Review {
  id: string;
  userId: string | null;
  rating: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
}

interface Stats {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

const REVIEWS_PER_PAGE = 10;

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, startDate, endDate, ratingFilter, statusFilter, debouncedSearch]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reviews");
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/reviews/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      setReviews((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Не удалось удалить отзыв");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "pending" | "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }

      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Не удалось обновить статус");
      // Reload to get correct status from server
      fetchReviews();
    }
  };

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (startDate) {
      const start = new Date(startDate);
      result = result.filter((r) => new Date(r.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.createdAt) <= end);
    }

    if (ratingFilter !== "all") {
      const targetRating = parseInt(ratingFilter);
      result = result.filter((r) => {
        const rating = parseFloat(r.rating);
        const roundedDown = Math.floor(rating);
        return roundedDown === targetRating;
      });
    }

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(query) ||
          r.userId?.toLowerCase().includes(query) ||
          r.userName?.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [reviews, sortBy, startDate, endDate, ratingFilter, statusFilter, debouncedSearch]);

  const stats: Stats = useMemo(() => {
    const counts: Stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const rating = parseFloat(r.rating);
      const roundedDown = Math.floor(rating) as 1 | 2 | 3 | 4 | 5;
      if (roundedDown >= 1 && roundedDown <= 5) {
        counts[roundedDown]++;
      }
    });
    return counts;
  }, [reviews]);

  const totalReviews = reviews.length;
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + parseFloat(r.rating), 0);
    return sum / reviews.length;
  }, [reviews]);

  const columns: Column<Review>[] = [
    {
      key: "index",
      header: "№",
      width: "w-10",
      hideOnMobile: true,
      render: (_r, index) => <span className="text-slate-600">{index + 1}</span>,
    },
    {
      key: "reviewId",
      header: "ID отзыва",
      width: "w-24",
      render: (r) => (
        <span className="text-xs text-slate-500 font-mono">
          {r.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "userId",
      header: "ID юзера",
      width: "w-24",
      render: (r) => (
        <span className="text-xs text-slate-500 font-mono">
          {r.userId ? `${r.userId.slice(0, 8)}...` : "—"}
        </span>
      ),
    },
    {
      key: "userName",
      header: "Имя",
      width: "w-28",
      render: (r) => (
        <span className="text-xs text-slate-700">{r.userName || "Аноним"}</span>
      ),
    },
    {
      key: "rating",
      header: "Рейтинг",
      width: "w-16",
      render: (r) => (
        <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
          {parseFloat(r.rating).toFixed(1)}★
        </span>
      ),
    },
    {
      key: "description",
      header: "Описание",
      mobileFullWidth: true,
      mobileLabel: "Описание",
      render: (r) => {
        const isExpanded = expandedId === r.id;
        return (
          <div
            onClick={() => setExpandedId(isExpanded ? null : r.id)}
            className="cursor-pointer"
          >
            <p
              className={`text-sm text-slate-700 transition-all duration-300 ${
                isExpanded ? "" : "line-clamp-2"
              }`}
            >
              {r.description}
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Статус",
      width: "w-28",
      render: (r) => (
        <ReviewStatusCell
          status={r.status}
          onChange={(newStatus) => handleStatusChange(r.id, newStatus)}
        />
      ),
    },
    {
      key: "date",
      header: "Дата",
      width: "w-32",
      render: (r) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(r.createdAt).toLocaleString("ru-RU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "center",
      width: "w-12",
      mobileLabel: "Действия",
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleteId(r.id);
          }}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Удалить отзыв"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6" style={{ fontFamily: "Onest, sans-serif" }}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Управление отзывами</h1>
        <Link
          href="/admin/reviews/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Добавить фейк отзыв
        </Link>
      </div>

      {/* Statistics */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-8">
          {/* Left side - Bars */}
          <div className="flex-1 max-w-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Статистика отзывов</h2>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-black text-slate-900">{averageRating.toFixed(1)}</div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-current"
                      style={{ color: i < Math.floor(averageRating) ? "#f59e0b" : "#e5e7eb" }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats[star as keyof Stats];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-sm font-semibold text-slate-700">{star}</span>
                      <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                    </div>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-sm font-semibold text-slate-700">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-12 text-right">
                      <span className="text-sm text-slate-500">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right side - Status Circle */}
          <div className="flex items-center justify-center self-center px-8 py-4">
            {averageRating >= 4 ? (
              <div className="flex flex-col items-center">
                <div className="w-44 h-44 rounded-full bg-green-100 border-8 border-green-500 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="text-5xl font-black text-green-700">{averageRating.toFixed(1)}</div>
                    <div className="text-sm font-semibold text-green-600">из 5</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700">Отлично!</div>
                  <div className="text-sm text-slate-600">Клиенты довольны</div>
                </div>
              </div>
            ) : averageRating >= 3 ? (
              <div className="flex flex-col items-center">
                <div className="w-44 h-44 rounded-full bg-orange-100 border-8 border-orange-500 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="text-5xl font-black text-orange-700">{averageRating.toFixed(1)}</div>
                    <div className="text-sm font-semibold text-orange-600">из 5</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-700">Хорошо</div>
                  <div className="text-sm text-slate-600">Есть что улучшить</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-44 h-44 rounded-full bg-red-100 border-8 border-red-500 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="text-5xl font-black text-red-700">{averageRating.toFixed(1)}</div>
                    <div className="text-sm font-semibold text-red-600">из 5</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-700">Требует внимания</div>
                  <div className="text-sm text-slate-600">Нужны улучшения</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Дата до
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Рейтинг
            </label>
            <CustomSelect
              value={ratingFilter}
              onChange={setRatingFilter}
              className="w-full"
              buttonClassName="bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm"
              options={[
                { value: "all", label: "Все" },
                { value: "5", label: "5 звёзд" },
                { value: "4", label: "4 звезды" },
                { value: "3", label: "3 звезды" },
                { value: "2", label: "2 звезды" },
                { value: "1", label: "1 звезда" },
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
                { value: "pending", label: "На модерации" },
                { value: "approved", label: "Одобрен" },
                { value: "rejected", label: "Отклонён" },
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
            placeholder="Поиск по ID, имени пользователя, тексту отзыва..."
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Reviews Table */}
      <DataTable
        columns={columns}
        data={filteredReviews}
        getRowKey={(r) => r.id}
        loading={loading}
        emptyMessage="Отзывы не найдены"
        page={page}
        pageSize={REVIEWS_PER_PAGE}
        onPageChange={setPage}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Удалить отзыв?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Это действие нельзя отменить. Отзыв будет удалён навсегда.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Удаление..." : "Удалить"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-full font-semibold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
