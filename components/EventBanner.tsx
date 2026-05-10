"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EventBannerProps {
  eventType: "theatre" | "abyss";
  endsAt: Date;
}

export default function EventBanner({ eventType, endsAt }: EventBannerProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = endsAt.getTime() - now.getTime();

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
  }, [endsAt]);

  const isTheatre = eventType === "theatre";
  const title = isTheatre ? "Театр Воображариум" : "Событие Бездны";
  const bgImage = isTheatre ? "/images/events/teatr_event.png" : "/images/events/abyss_event.png";
  const targetSection = isTheatre ? "theatre" : "abyss";

  const handleClick = () => {
    router.push(`/services#${targetSection}`);
  };

  return (
    <div className="relative w-full px-4 sm:px-6 py-8">
      <div className="mx-auto" style={{ maxWidth: "75rem" }}>
        <div
          onClick={handleClick}
          className="relative overflow-hidden rounded-3xl cursor-pointer group transition-transform hover:scale-[1.02] duration-300"
          style={{
            background: `linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)`,
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
            className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-80 transition-opacity duration-300"
            style={{
              backgroundImage: `url(${bgImage})`,
            }}
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg,
                rgba(139, 92, 246, 0.2) 0%,
                rgba(59, 130, 246, 0.15) 50%,
                rgba(168, 85, 247, 0.2) 100%)`,
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
                {title}
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-white/90 drop-shadow-md">
                Скидка 15% на все услуги
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
                  <div
                    className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 min-w-[60px] sm:min-w-[80px] border border-white/30 shadow-xl"
                  >
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
                  <div
                    className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 min-w-[60px] sm:min-w-[80px] border border-white/30 shadow-xl"
                  >
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
                  <div
                    className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 min-w-[60px] sm:min-w-[80px] border border-white/30 shadow-xl"
                  >
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
      </div>

      <style jsx>{`
        @keyframes borderShine {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(90deg);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-10px) translateX(-10px) rotate(180deg);
            opacity: 0.4;
          }
          75% {
            transform: translateY(-30px) translateX(5px) rotate(270deg);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
