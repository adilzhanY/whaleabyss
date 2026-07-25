"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, RefreshCw, WifiOff } from "lucide-react";
import { useAddonError } from "@/store/useAddonError";

/**
 * Shown when a quest-gated service can't be added because its quest list
 * couldn't be loaded. The add is refused, not silently degraded.
 *
 * Degrading used to mean adding the line anyway with no declaration, which is
 * the shape that reached production twice as an unfulfillable paid order. Now
 * the failure is visible and one tap from being retried; the customer keeps
 * their cart either way.
 *
 * Mirrors RankGateModal's container so the three add-to-cart modals match.
 */
export default function AddonUnavailableModal() {
  const { isOpen, serviceName, retry, close } = useAddonError();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRetry = () => {
    const again = retry;
    close();
    again?.();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

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
                Не удалось загрузить задания
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-snug">
                {serviceName
                  ? `Для услуги «${serviceName}» нужно выбрать, что делать с заданиями локации, но список не загрузился.`
                  : "Для этой услуги нужно выбрать, что делать с заданиями локации, но список не загрузился."}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-start gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50/60 px-4 py-3">
            <WifiOff className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
            <p className="text-sm text-slate-600 leading-snug">
              Похоже, связь пропала. Проверьте интернет и попробуйте ещё раз —
              корзина сохранена.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 space-y-2.5">
          {retry && (
            <button
              onClick={handleRetry}
              className="btn-primary w-full !py-3 !text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Попробовать снова</span>
            </button>
          )}
          <button
            onClick={close}
            className="w-full py-2.5 rounded-full text-sm font-semibold border-2 border-slate-200 text-slate-700 hover:border-[#0B5191] hover:text-[#0B5191] transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
