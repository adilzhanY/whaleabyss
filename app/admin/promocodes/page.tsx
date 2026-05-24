"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Percent } from "lucide-react";
import Link from "next/link";

interface Promocode {
  id: string;
  code: string;
  discountPercent: number;
  expiresAt: string;
  createdAt: string;
  usageCount: number;
}

export default function PromocodesPage() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!confirm("Удалить этот промокод?")) return;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
            Промокоды
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Управление промокодами и статистика использования
          </p>
        </div>
        <Link
          href="/admin/promocodes/new"
          className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-4 !rounded-full"
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
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4 !rounded-full"
          >
            <Plus className="w-4 h-4" />
            Создать первый промокод
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Код
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Скидка
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Использований
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Истекает
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promocodes.map((promo) => {
                  const expired = isExpired(promo.expiresAt);
                  return (
                    <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-950 text-lg">
                            {promo.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                          <Percent className="w-4 h-4 text-green-600" />
                          {promo.discountPercent}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-700">
                          {promo.usageCount} раз
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(promo.expiresAt).toLocaleDateString("ru-RU")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {expired ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700">
                            Истёк
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm hover:shadow"
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
