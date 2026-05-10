"use client";

import { useState, useEffect, useMemo } from "react";
import { Trash2, Search, Star } from "lucide-react";

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

const REVIEWS_PER_PAGE = 20;

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

  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * REVIEWS_PER_PAGE;
    return filteredReviews.slice(start, start + REVIEWS_PER_PAGE);
  }, [filteredReviews, page]);

  const totalPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE);

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

  const getStatusBadge = (status: string, reviewId: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
      approved: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    };
    const labels = {
      pending: "На модерации",
      approved: "Одобрен",
      rejected: "Отклонён",
    };

    return (
      <div className="relative group">
        <button
          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${styles[status as keyof typeof styles]}`}
        >
          {labels[status as keyof typeof labels]}
        </button>
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange(reviewId, "approved");
            }}
            className="block w-full px-3 py-1.5 text-left text-xs hover:bg-green-50 text-green-700"
          >
            Одобрить
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange(reviewId, "pending");
            }}
            className="block w-full px-3 py-1.5 text-left text-xs hover:bg-yellow-50 text-yellow-700"
          >
            На модерацию
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange(reviewId, "rejected");
            }}
            className="block w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 text-red-700"
          >
            Отклонить
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6" style={{ fontFamily: "Onest, sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Управление отзывами</h1>
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
              Дата от
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Дата до
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Рейтинг
            </label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="all">Все</option>
              <option value="5">5 звёзд</option>
              <option value="4">4 звезды</option>
              <option value="3">3 звезды</option>
              <option value="2">2 звезды</option>
              <option value="1">1 звезда</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Статус
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="all">Все</option>
              <option value="pending">На модерации</option>
              <option value="approved">Одобрен</option>
              <option value="rejected">Отклонён</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ID, имени пользователя, тексту отзыва..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500">Отзывы не найдены</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-600 w-10">№</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-600 w-24">ID отзыва</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-600 w-24">ID юзера</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-600 w-28">Имя</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-600 w-16">Рейтинг</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-600">Описание</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-600 w-28">Статус</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-slate-600 w-32">Дата</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-600 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedReviews.map((review, index) => {
                  const rating = parseFloat(review.rating);
                  const globalIndex = (page - 1) * REVIEWS_PER_PAGE + index + 1;
                  const isExpanded = expandedId === review.id;

                  return (
                    <tr key={review.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-3 text-sm text-slate-600">{globalIndex}</td>
                      <td className="px-2 py-3 text-xs text-slate-500 font-mono">{review.id.slice(0, 8)}...</td>
                      <td className="px-2 py-3 text-xs text-slate-500 font-mono">
                        {review.userId ? `${review.userId.slice(0, 8)}...` : "—"}
                      </td>
                      <td className="px-2 py-3 text-xs text-slate-700">
                        {review.userName || "Аноним"}
                      </td>
                      <td className="px-2 py-3 text-sm font-semibold text-slate-700">{rating.toFixed(1)}★</td>
                      <td className="px-2 py-3">
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : review.id)}
                          className="cursor-pointer"
                        >
                          <p className={`text-sm text-slate-700 transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {review.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {getStatusBadge(review.status, review.id)}
                      </td>
                      <td className="px-2 py-3 text-xs text-slate-500">
                        {new Date(review.createdAt).toLocaleString("ru-RU", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => setDeleteId(review.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить отзыв"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Удаление..." : "Удалить"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
