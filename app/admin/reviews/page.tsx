"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Trash2, Plus } from "lucide-react";
import CustomSearchField from "@/components/CustomSearchField";
import CustomSelect from "@/components/CustomSelect";
import DataTable, { type Column } from "../_components/DataTable";
import ReviewStatusCell from "../_components/ReviewStatusCell";
import PageHeader from "../_components/PageHeader";
import OrderDateRangePicker from "../_components/OrderDateRangePicker";

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
    <div className="max-w-7xl mx-auto">
      <PageHeader
        actions={
          <Link
            href="/admin/reviews/new"
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4 shrink-0 text-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Добавить фейк отзыв</span>
          </Link>
        }
      />

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

          <div className="w-full sm:w-72">
            <OrderDateRangePicker
              label="Период"
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>

          <div className="w-full sm:w-40">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Рейтинг
            </label>
            <CustomSelect
              value={ratingFilter}
              onChange={setRatingFilter}
              className="w-full"
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
                { value: "pending", label: "На модерации" },
                { value: "approved", label: "Одобрен" },
                { value: "rejected", label: "Отклонён" },
              ]}
            />
          </div>

          <CustomSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Поиск по ID, имени, тексту отзыва..."
            className="flex-1 min-w-[220px]"
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
