"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Gauge, UserCog } from "lucide-react";
import { useRankGate } from "@/store/useRankGate";

/**
 * Shown when a user tries to add a service whose Adventure Rank requirement is
 * above their current rank (or when they haven't set a rank yet). Adding is
 * blocked; the modal explains why and links to the profile where the rank is
 * edited. The actual enforcement happens both here (UX) and server-side at
 * checkout (`/api/checkout` re-parses the requirement) so it can't be bypassed.
 */
export default function RankGateModal() {
  const { isOpen, requiredRank, currentRank, close } = useRankGate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const noRank = currentRank == null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Card — mirrors QuestAddonModal's container so the two modals match. */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh]">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <button
            onClick={close}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100 cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex items-start gap-4 pr-8">
            <Image
              src="/images/valle_chibi_sad.png"
              alt="Valle"
              width={56}
              height={56}
              className="w-14 h-14 shrink-0 object-contain"
            />
            <div>
              <h2
                className="text-lg sm:text-xl font-bold text-[#0B5191]"
                style={{ fontFamily: "var(--font-primary), sans-serif" }}
              >
                {noRank ? "Укажите ранг приключений" : "Недостаточный ранг приключений"}
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-snug">
                {noRank
                  ? "Чтобы добавить эту услугу, укажите ваш ранг приключений в профиле."
                  : "Эта услуга недоступна для вашего текущего ранга приключений."}
              </p>
            </div>
          </div>
        </div>

        {/* Rank comparison */}
        <div className="px-6 py-5">
          <div className="flex items-stretch gap-3">
            <div className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50/60 px-4 py-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Требуется
              </p>
              <p
                className="mt-1 text-2xl font-bold text-[#0B5191]"
                style={{ fontFamily: "var(--font-primary), sans-serif" }}
              >
                {requiredRank}
              </p>
            </div>
            <div className="flex items-center text-slate-300">
              <Gauge className="h-5 w-5" />
            </div>
            <div className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50/60 px-4 py-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Ваш ранг
              </p>
              <p
                className="mt-1 text-2xl font-bold text-slate-700"
                style={{ fontFamily: "var(--font-primary), sans-serif" }}
              >
                {noRank ? "—" : currentRank}
              </p>
            </div>
          </div>
          {!noRank && (
            <p className="mt-3 text-xs text-slate-400 text-center leading-snug">
              Если вы указали ранг по ошибке, измените его в профиле.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 px-6 py-4 space-y-2.5">
          <Link
            href="/profile"
            onClick={close}
            className="btn-primary w-full !py-3 !text-sm flex items-center justify-center gap-2"
          >
            <UserCog className="w-4 h-4" />
            <span>Перейти в профиль</span>
          </Link>
          <button
            onClick={close}
            className="w-full py-2.5 rounded-full text-sm font-semibold border-2 border-slate-200 text-slate-700 hover:border-[#0B5191] hover:text-[#0B5191] transition-colors cursor-pointer"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
