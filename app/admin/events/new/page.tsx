"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";
import Checkbox from "@/components/Checkbox";

interface Service {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState(15);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) {
        const data = await res.json();
        setAllServices(data);
      }
    } catch (err) {
      console.error("Failed to load services", err);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name || !slug || !startsAt || !endsAt) {
      setError("Заполните все обязательные поля");
      return;
    }

    if (selectedServices.length === 0) {
      setError("Выберите хотя бы одну услугу");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description,
          discountPercent,
          backgroundUrl,
          startsAt,
          endsAt,
          serviceIds: selectedServices,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при создании события");
      }

      router.push("/admin/events");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/events"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
            Новое событие
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Создайте событие со скидками на услуги
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Название события *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Театр Воображариум"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Slug (для URL) *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="theatre-event"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-lg font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание события..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-base outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Скидка (%) *
            </label>
            <input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              min={1}
              max={100}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              URL фона
            </label>
            <input
              type="text"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              placeholder="/images/events/teatr_event.png"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-base outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">
              Загрузите изображение в /public/images/events/ и укажите путь
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Начало события *
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-base outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Конец события *
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-base outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Выберите услуги *
            </label>
            <div className="border border-slate-200 rounded-xl p-4 max-h-96 overflow-y-auto">
              {allServices.length === 0 ? (
                <p className="text-sm text-slate-500">Загрузка услуг...</p>
              ) : (
                <div className="space-y-2">
                  {allServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        size={20}
                        aria-label={`Выбрать услугу ${service.title}`}
                      />
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => toggleService(service.id)}
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {service.title}
                        </p>
                        <p className="text-xs text-slate-500">{service.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Выбрано услуг: {selectedServices.length}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 !py-3 !rounded-full !shadow-lg hover:!shadow-xl transition-shadow"
            >
              {loading ? "Создание..." : "Создать событие"}
            </button>
            <Link
              href="/admin/events"
              className="flex-1 px-6 py-3 rounded-full border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all text-center shadow-sm hover:shadow"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
