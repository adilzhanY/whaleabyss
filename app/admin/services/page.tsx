"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Plus, Sparkles } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import Input from "@/components/Input";
import DataTable, { type Column } from "../_components/DataTable";

interface ServiceRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  price: string;
  imageUrl: string | null;
  category: string | null;
  categorySlug: string | null;
  featuredInActual: boolean;
  regions: string[];
  updatedAt: string | null;
}

const SERVICES_PER_PAGE = 10;

export default function AdminServicesPage() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, regionFilter, debouncedSearch]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/services");
      const data = await res.json();
      setRows(data.services || []);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter options are derived from the loaded data.
  const categoryOptions = useMemo(() => {
    const titles = [...new Set(rows.map((s) => s.category).filter(Boolean))] as string[];
    titles.sort((a, b) => a.localeCompare(b, "ru"));
    return titles;
  }, [rows]);

  const regionOptions = useMemo(() => {
    const labels = [...new Set(rows.flatMap((s) => s.regions))];
    labels.sort((a, b) => a.localeCompare(b, "ru"));
    return labels;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = [...rows];

    if (categoryFilter !== "all") {
      result = result.filter((s) => s.category === categoryFilter);
    }
    if (regionFilter !== "all") {
      result = result.filter((s) => s.regions.includes(regionFilter));
    }
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.slug.toLowerCase().includes(query) ||
          s.subtitle?.toLowerCase().includes(query) ||
          s.regions.some((r) => r.toLowerCase().includes(query))
      );
    }

    return result;
  }, [rows, categoryFilter, regionFilter, debouncedSearch]);

  const columns: Column<ServiceRow>[] = [
    {
      key: "index",
      header: "№",
      width: "w-12",
      hideOnMobile: true,
      render: (_s, index) => <span className="text-slate-600">{index + 1}</span>,
    },
    {
      key: "service",
      header: "Услуга",
      width: "w-64",
      render: (s) => (
        <div className="flex items-center gap-3 min-w-0 max-w-60">
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.imageUrl}
              alt=""
              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-medium text-slate-800 truncate" title={s.title}>
              {s.title}
            </div>
            <div className="text-xs text-slate-500 font-mono truncate" title={s.slug}>
              {s.slug}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Категория",
      width: "w-36",
      render: (s) => (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{s.category ?? "—"}</span>
          {s.featuredInActual && s.categorySlug !== "actual" && (
            <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap">
              <Sparkles className="w-3 h-3" strokeWidth={2.25} />
              Актуальное
            </span>
          )}
        </div>
      ),
    },
    {
      key: "regions",
      header: "Регионы",
      render: (s) =>
        s.regions.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-60">
            {s.regions.map((label) => (
              <span
                key={label}
                className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium whitespace-nowrap"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "price",
      header: "Цена",
      align: "right",
      width: "w-24",
      render: (s) => (
        <span className="font-medium whitespace-nowrap">
          {Number(s.price).toLocaleString("ru-RU")} ₽
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Обновлено",
      align: "right",
      width: "w-28",
      hideOnMobile: true,
      render: (s) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {s.updatedAt
            ? new Date(s.updatedAt).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              })
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6" style={{ fontFamily: "Onest, sans-serif" }}>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Услуги</h1>
          <p className="text-sm text-slate-600 mt-1">
            Всего услуг: {rows.length}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/services/categories"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-600 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Новая категория
          </Link>
          <Link
            href="/admin/services/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Новая услуга
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Категория
            </label>
            <CustomSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="w-full"
              buttonClassName="bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm"
              options={[
                { value: "all", label: "Все" },
                ...categoryOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Регион
            </label>
            <CustomSelect
              value={regionFilter}
              onChange={setRegionFilter}
              className="w-full"
              buttonClassName="bg-white px-3 py-2 rounded-lg border border-slate-300 text-sm"
              options={[
                { value: "all", label: "Все" },
                ...regionOptions.map((r) => ({ value: r, label: r })),
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
            placeholder="Поиск по названию, slug, региону..."
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Services Table */}
      <DataTable
        columns={columns}
        data={filtered}
        getRowKey={(s) => s.id}
        loading={loading}
        emptyMessage="Услуги не найдены"
        onRowClick={(s) => {
          window.location.href = `/admin/services/${s.id}`;
        }}
        page={page}
        pageSize={SERVICES_PER_PAGE}
        onPageChange={setPage}
      />
    </div>
  );
}
