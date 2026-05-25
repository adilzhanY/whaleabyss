"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

/**
 * Admin-only new-order notifier. Polls for freshly-paid orders and, for any
 * that appeared after the panel was opened, plays a "kaching" sound and shows
 * a top-right toast. Mounted from the admin layout, so it never runs on
 * customer-facing pages.
 *
 * Polling (not SSE/websockets) keeps this serverless-friendly. Orders present
 * at first load are baselined silently; only genuinely new ones notify.
 */

const POLL_MS = 20000;
const SOUND_SRC = "/sounds/money.mp3";

interface PaidOrder {
  id: string;
  totalPrice: string;
  username: string | null;
}

interface ToastItem {
  id: string;
  amount: string;
  customer: string;
}

export default function OrderNotifier() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Prepare the sound and unlock it on the first user gesture (browser autoplay
  // policy blocks audio until the page has been interacted with).
  useEffect(() => {
    const audio = new Audio(SOUND_SRC);
    audio.preload = "auto";
    audioRef.current = audio;

    const unlock = () => {
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const playSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {}
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders/recent-paid", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: PaidOrder[] = data.orders ?? [];

      // First load = baseline: remember what's already there, notify for nothing.
      if (!initialized.current) {
        list.forEach((o) => seenIds.current.add(o.id));
        initialized.current = true;
        return;
      }

      const fresh = list.filter((o) => !seenIds.current.has(o.id));
      if (fresh.length === 0) return;

      fresh.forEach((o) => seenIds.current.add(o.id));
      // Keep the seen-set bounded over a long session.
      if (seenIds.current.size > 200) {
        seenIds.current = new Set(list.map((o) => o.id));
      }

      playSound();
      setToasts((prev) =>
        [
          ...fresh.map((o) => ({
            id: o.id,
            amount: Number(o.totalPrice).toLocaleString("ru-RU"),
            customer: o.username ?? "Гость",
          })),
          ...prev,
        ].slice(0, 5)
      );
    } catch {
      /* network blip — ignore, next poll retries */
    }
  }, [playSound]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
      {toasts.map((t) => (
        <OrderToast key={t.id} toast={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function OrderToast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(onClose, 12000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      onClick={() => router.push(`/admin/orders/${toast.id}`)}
      className="relative flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 pr-10 shadow-xl transition-shadow hover:shadow-2xl animate-in slide-in-from-right-5 fade-in duration-300 min-w-[260px]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">Новый заказ! 🎉</p>
        <p className="truncate text-xs text-slate-500">
          {toast.customer} · {toast.amount} ₽
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Закрыть"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
