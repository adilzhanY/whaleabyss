"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { Clock, Percent, Calendar } from "lucide-react";
import { getActiveEvent } from "@/lib/events";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

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
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Memoize activeEvent to prevent recreating it on every render
  const activeEvent = useMemo(() => getActiveEvent(), []);
  // Extract the timestamp once for stable dependency
  const eventEndTime = useMemo(() => activeEvent?.endsAt.getTime() ?? null, [activeEvent]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!eventEndTime) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = eventEndTime - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [eventEndTime]);

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
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="site-gutter pt-28 md:pt-32 pb-20">
        <div className="site-container">
        <Breadcrumb />
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
        ) : !activeEvent && events.length === 0 ? (
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
            {/* Monthly Active Event (Theatre/Abyss) */}
            {activeEvent && (
              <div className="space-y-6">
                <Link
                  href={`/services#${activeEvent.type}`}
                  className="block group"
                >
                  <div
                    className="relative overflow-hidden rounded-3xl cursor-pointer transition-transform hover:scale-[1.02] duration-300"
                    style={{
                      minHeight: "320px",
                    }}
                  >
                    {/* Animated purple border */}
                    <div className="absolute inset-0 rounded-3xl overflow-hidden">
                      <div
                        className="absolute inset-0 rounded-3xl"
                        style={{
                          background: `linear-gradient(90deg,
                            transparent 0%,
                            rgba(168, 85, 247, 0.4) 25%,
                            rgba(139, 92, 246, 0.6) 50%,
                            rgba(168, 85, 247, 0.4) 75%,
                            transparent 100%)`,
                          backgroundSize: "200% 100%",
                          animation: "borderShine 3s linear infinite",
                          padding: "3px",
                          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                          WebkitMaskComposite: "xor",
                          maskComposite: "exclude",
                        }}
                      />
                    </div>

                    {/* Background image */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
                      style={{
                        backgroundImage: `url(${activeEvent.type === "theatre" ? "/images/events/teatr_event.png" : "/images/events/abyss_event.png"})`,
                      }}
                    />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 md:p-10">
                      {/* Left side - Text */}
                      <div className="flex-1 text-center md:text-left">
                        <h2
                          className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-lg"
                          style={{ fontFamily: "var(--font-primary), sans-serif" }}
                        >
                          {activeEvent.type === "theatre" ? "Театр Воображариум" : "Витая Бездна"}
                        </h2>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-white/90 drop-shadow-md">
                          Скидка {activeEvent.discountPercent}% на все услуги
                        </p>
                      </div>

                      {/* Right side - Timer */}
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-sm sm:text-base font-semibold text-white/80 uppercase tracking-wider">
                          До конца события
                        </p>
                        <div className="flex gap-2 sm:gap-3">
                          {/* Hours */}
                          <div className="flex flex-col items-center">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 min-w-[60px] sm:min-w-[80px] border border-white/30 shadow-xl">
                              <div
                                className="text-2xl sm:text-3xl md:text-4xl font-black text-white text-center"
                                style={{ fontFamily: "var(--font-primary), sans-serif" }}
                              >
                                {String(timeLeft.hours).padStart(2, "0")}
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-white/70 mt-1 uppercase">
                              Часов
                            </span>
                          </div>

                          <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white self-start pt-2 sm:pt-3">
                            :
                          </div>

                          {/* Minutes */}
                          <div className="flex flex-col items-center">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 min-w-[60px] sm:min-w-[80px] border border-white/30 shadow-xl">
                              <div
                                className="text-2xl sm:text-3xl md:text-4xl font-black text-white text-center"
                                style={{ fontFamily: "var(--font-primary), sans-serif" }}
                              >
                                {String(timeLeft.minutes).padStart(2, "0")}
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-white/70 mt-1 uppercase">
                              Минут
                            </span>
                          </div>

                          <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white self-start pt-2 sm:pt-3">
                            :
                          </div>

                          {/* Seconds */}
                          <div className="flex flex-col items-center">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 min-w-[60px] sm:min-w-[80px] border border-white/30 shadow-xl">
                              <div
                                className="text-2xl sm:text-3xl md:text-4xl font-black text-white text-center"
                                style={{ fontFamily: "var(--font-primary), sans-serif" }}
                              >
                                {String(timeLeft.seconds).padStart(2, "0")}
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-white/70 mt-1 uppercase">
                              Секунд
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Database Events */}
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
        </div>
      </main>

      <Footer />

      <style jsx>{`
        @keyframes borderShine {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
