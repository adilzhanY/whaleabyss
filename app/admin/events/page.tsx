"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, Percent, Edit } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discountPercent: number;
  backgroundUrl: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  serviceIds: string[];
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить это событие?")) return;

    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        alert("Ошибка при удалении события");
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Ошибка при удалении события");
    }
  };

  const isEventActive = (startsAt: string, endsAt: string) => {
    const now = new Date();
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    return now >= start && now <= end;
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
            События
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Управление событиями и скидками на услуги
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-4 !rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Создать событие
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-4">Событий пока нет</p>
          <Link
            href="/admin/events/new"
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4 !rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Создать первое событие
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const active = isEventActive(event.startsAt, event.endsAt);
            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {event.backgroundUrl && (
                  <div
                    className="h-32 bg-cover bg-center"
                    style={{ backgroundImage: `url(${event.backgroundUrl})` }}
                  />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-blue-950">
                      {event.name}
                    </h3>
                    {active ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                        Активно
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                        Неактивно
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Percent className="w-4 h-4 text-green-600" />
                      Скидка {event.discountPercent}%
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CalendarIcon className="w-4 h-4" />
                      {new Date(event.startsAt).toLocaleDateString("ru-RU")} -{" "}
                      {new Date(event.endsAt).toLocaleDateString("ru-RU")}
                    </div>
                    <div className="text-xs text-slate-500">
                      Услуг: {event.serviceIds.length}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Изменить
                    </Link>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
