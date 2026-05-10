"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import { Clock, Percent, Calendar } from "lucide-react";

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discountPercent: number;
  backgroundUrl: string | null;
  startsAt: string;
  endsAt: string;
  services: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    price: string;
    imageUrl: string | null;
  }>;
}

export default function EventsClient() {
  const [authOpen, setAuthOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
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

  const getTimeRemaining = (endsAt: string) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Завершено";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `Осталось ${days} дн. ${hours} ч.`;
    return `Осталось ${hours} ч.`;
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <CartModal />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-12 text-center">
          <h1
            className="text-4xl sm:text-5xl font-black text-blue-950 mb-4"
            style={{ fontFamily: "var(--font-primary), sans-serif" }}
          >
            Активные события
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Специальные предложения и скидки на услуги
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Clock className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-700 mb-2">
              Нет активных событий
            </h2>
            <p className="text-slate-500">
              Следите за обновлениями, скоро появятся новые события!
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {events.map((event) => (
              <div key={event.id} className="space-y-6">
                {/* Event Header */}
                <div
                  className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
                  style={{
                    backgroundImage: event.backgroundUrl
                      ? `linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(168, 85, 247, 0.3) 100%), url(${event.backgroundUrl})`
                      : "linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(59, 130, 246, 0.7) 50%, rgba(168, 85, 247, 0.8) 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                      <h2
                        className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg"
                        style={{ fontFamily: "var(--font-primary), sans-serif" }}
                      >
                        {event.name}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold">
                          <Percent className="w-5 h-5" />
                          -{event.discountPercent}%
                        </span>
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold text-sm">
                          <Clock className="w-4 h-4" />
                          {getTimeRemaining(event.endsAt)}
                        </span>
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-lg text-white/90 drop-shadow-md max-w-3xl">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
