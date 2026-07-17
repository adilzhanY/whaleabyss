"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Checkbox from "@/components/Checkbox";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import PageHeader from "../../_components/PageHeader";

interface Service {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
}

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

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState(15);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvent();
    fetchServices();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`);
      if (res.ok) {
        const data: Event = await res.json();
        setName(data.name);
        setSlug(data.slug);
        setDescription(data.description || "");
        setDiscountPercent(data.discountPercent);
        setBackgroundUrl(data.backgroundUrl || "");
        setIsActive(data.isActive);
        setSelectedServices(data.serviceIds);

        // Convert ISO strings to datetime-local format
        const startDate = new Date(data.startsAt);
        const endDate = new Date(data.endsAt);
        setStartsAt(formatDateTimeLocal(startDate));
        setEndsAt(formatDateTimeLocal(endDate));
      } else {
        setError("Не удалось загрузить событие");
      }
    } catch (err) {
      console.error("Failed to load event", err);
      setError("Ошибка при загрузке события");
    } finally {
      setLoading(false);
    }
  };

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

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
      setSaving(true);
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description,
          discountPercent,
          backgroundUrl,
          startsAt,
          endsAt,
          isActive,
          serviceIds: selectedServices,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при обновлении события");
      }

      router.push("/admin/events");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/events"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <PageHeader subtitle="Изменение параметров события" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Название события *
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Театр Воображариум"
                className="text-lg font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Slug (для URL) *
              </label>
              <Input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="theatre-event"
                className="text-lg font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Описание
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание события..."
              rows={3}
              className="text-base"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Скидка (%) *
              </label>
              <Input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                min={1}
                max={100}
                className="text-lg font-semibold"
                required
              />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isActive}
                  onChange={setIsActive}
                  size={20}
                  aria-label="Событие активно"
                />
                <span
                  onClick={() => setIsActive(!isActive)}
                  className="text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  Событие активно
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 ml-8">
                Неактивные события не отображаются на сайте
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              URL фона
            </label>
            <Input
              type="text"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              placeholder="/images/events/teatr_event.png"
              className="text-base"
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
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="text-base"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Конец события *
              </label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="text-base"
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
              disabled={saving}
              className="btn-primary flex-1 !py-3 !rounded-full !shadow-lg hover:!shadow-xl transition-shadow"
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
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
