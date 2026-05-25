"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import Link from "next/link";
import TelegramIcon from "@/components/TelegramIcon";

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

  useEffect(() => {
    fetchBoosters();
  }, []);

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
            Качеры
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Реестр исполнителей. Добавляйте и редактируйте вручную — вход в систему им не нужен.
          </p>
        </div>
        <Link
          href="/admin/boosters/new"
          className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-4 !rounded-full"
        >
          <Plus className="w-4 h-4" />
          Добавить качера
        </Link>
      </div>

      {boosters.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-4">Качеров пока нет</p>
          <Link
            href="/admin/boosters/new"
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4 !rounded-full"
          >
            <Plus className="w-4 h-4" />
            Добавить первого
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["ID", "Имя", "Telegram", "Комиссия", "Баланс", "Завершено", "Статус", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boosters.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">
                      <Link href={`/admin/booster/${b.id}`} className="text-indigo-600 hover:underline">
                        {b.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/booster/${b.id}`} className="font-semibold text-blue-950 hover:text-indigo-600">
                        {b.firstName} {b.lastName}
                      </Link>
                      {b.note && (
                        <div className="text-xs text-slate-400 mt-0.5 max-w-[220px] truncate">{b.note}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {b.telegramUsername ? (
                        <a
                          href={`https://t.me/${b.telegramUsername.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                        >
                          <TelegramIcon className="w-3.5 h-3.5" />
                          {b.telegramUsername}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{b.commissionPercent}%</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {Number(b.balance).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{b.completedOrders}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          b.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {b.status === "active" ? "Активен" : "Неактивен"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
