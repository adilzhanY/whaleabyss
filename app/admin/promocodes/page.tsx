"use client";

import { useState, useEffect } from "react";
import { Chip } from "@heroui/react";
import { Plus, Trash2, Calendar, Percent } from "lucide-react";
import Link from "next/link";
import PageHeader from "../_components/PageHeader";
import DataTable, { type Column } from "../_components/DataTable";
import { confirmDialog } from "@/store/useConfirm";

interface Promocode {
  id: string;
  code: string;
  discountPercent: number;
  expiresAt: string;
  createdAt: string;
  usageCount: number;
}

const PROMOCODES_PER_PAGE = 10;

export default function PromocodesPage() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchPromocodes();
  }, []);

  const fetchPromocodes = async () => {
    try {
      const res = await fetch("/api/admin/promocodes");
      if (res.ok) {
        const data = await res.json();
        setPromocodes(data);
      }
    } catch (error) {
      console.error("Failed to fetch promocodes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      title: "Удалить этот промокод?",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/promocodes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPromocodes((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("Ошибка при удалении промокода");
      }
    } catch (error) {
      console.error("Failed to delete promocode:", error);
      alert("Ошибка при удалении промокода");
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const columns: Column<Promocode>[] = [
    {
      key: "code",
      header: "Код",
      render: (promo) => (
        <span className="font-mono text-base font-bold text-blue-950">{promo.code}</span>
      ),
    },
    {
      key: "discount",
      header: "Скидка",
      render: (promo) => (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
          <Percent className="h-4 w-4 text-green-600" />
          {promo.discountPercent}%
        </span>
      ),
    },
    {
      key: "usage",
      header: "Использований",
      render: (promo) => (
        <span className="text-sm font-semibold text-slate-700">{promo.usageCount} раз</span>
      ),
    },
    {
      key: "expires",
      header: "Истекает",
      render: (promo) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
          <Calendar className="h-4 w-4" />
          {new Date(promo.expiresAt).toLocaleDateString("ru-RU")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (promo) => (
        <Chip
          size="sm"
          variant="soft"
          color={isExpired(promo.expiresAt) ? "danger" : "success"}
          className="text-[11px] font-bold"
        >
          <Chip.Label>{isExpired(promo.expiresAt) ? "Истёк" : "Активен"}</Chip.Label>
        </Chip>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "Действия",
      render: (promo) => (
        <button
          onClick={() => handleDelete(promo.id)}
          className="btn-danger-soft btn-sm text-xs"
        >
          <Trash2 className="h-4 w-4" />
          Удалить
        </button>
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
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader subtitle="Управление промокодами и статистика использования" />
      <div className="flex items-center justify-end">
        <Link
          href="/admin/promocodes/new"
          className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-4"
        >
          <Plus className="w-4 h-4" />
          Создать промокод
        </Link>
      </div>

      {promocodes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-4">Промокодов пока нет</p>
          <Link
            href="/admin/promocodes/new"
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4"
          >
            <Plus className="w-4 h-4" />
            Создать первый промокод
          </Link>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={promocodes}
          getRowKey={(promo) => promo.id}
          page={page}
          // Paginate only when it actually overflows — otherwise the footer
          // just prints «1–3 из 3» under three rows.
          {...(promocodes.length > PROMOCODES_PER_PAGE ? { pageSize: PROMOCODES_PER_PAGE } : {})}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
