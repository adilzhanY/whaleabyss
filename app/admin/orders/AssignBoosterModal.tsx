"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import TelegramIcon from "@/components/TelegramIcon";

interface BoosterRow {
  id: string;
  firstName: string;
  lastName: string;
  telegramUsername: string | null;
  status: "active" | "inactive";
  completedOrders: number;
}

interface AssignBoosterModalProps {
  orderId: string;
  onClose: () => void;
  /** Called after a successful assignment with the chosen booster. */
  onAssigned: (boosterId: string, boosterFirstName: string) => void;
}

export default function AssignBoosterModal({
  orderId,
  onClose,
  onAssigned,
}: AssignBoosterModalProps) {
  const [boosters, setBoosters] = useState<BoosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/boosters");
        if (res.ok) setBoosters(await res.json());
      } catch (e) {
        console.error("Failed to fetch boosters:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleAssign = async () => {
    if (!selectedId) return;
    const chosen = boosters.find((b) => b.id === selectedId);
    if (!chosen) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boosterId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось назначить качера");
      }
      onAssigned(chosen.id, chosen.firstName);
      onClose();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
              Назначить качера
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Заказ {orderId.slice(0, 8)}... перейдёт «В работу»
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Загрузка...</div>
          ) : boosters.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Качеров пока нет</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr className="text-slate-500 text-xs uppercase tracking-wider">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="text-left font-medium px-4 py-3">Имя</th>
                  <th className="text-left font-medium px-4 py-3">Telegram</th>
                  <th className="text-left font-medium px-4 py-3">Статус</th>
                  <th className="text-right font-medium px-4 py-3">Завершено заказов</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boosters.map((b) => {
                  const selected = selectedId === b.id;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      className={`cursor-pointer transition-colors ${
                        selected ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                            selected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-950">
                        {b.firstName} {b.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {b.telegramUsername ? (
                          <span className="inline-flex items-center gap-1 text-sky-600">
                            <TelegramIcon className="w-3.5 h-3.5" />
                            {b.telegramUsername}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {b.completedOrders}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-4">
          {error ? (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          ) : (
            <span className="text-sm text-slate-400">
              {selectedId ? "Качер выбран" : "Выберите качера из списка"}
            </span>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all"
            >
              Отмена
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedId || submitting}
              className="btn-primary !py-2.5 !px-6 !rounded-full disabled:opacity-50"
            >
              {submitting ? "Назначение..." : "Назначить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
