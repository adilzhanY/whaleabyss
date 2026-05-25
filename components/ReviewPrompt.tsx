"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Star, X } from "lucide-react";
import Textarea from "@/components/Textarea";

/**
 * Compact "leave a review" nudge. Shown once the logged-in user has a completed
 * order and hasn't reviewed yet (decided server-side by /api/user/review-prompt).
 * It's a condensed version of /reviews/new and shows the same "on moderation"
 * confirmation. Never appears on /admin. Dismissal is remembered per browser.
 */

const DISMISS_KEY = "review-prompt-dismissed";

export default function ReviewPrompt() {
  const { status } = useSession();
  const pathname = usePathname();
  const onAdmin = pathname?.startsWith("/admin") ?? false;

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated" || onAdmin) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {}

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/review-prompt", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.prompt) setOpen(true);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [status, onAdmin]);

  const remember = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const dismiss = () => {
    remember();
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError("Отзыв должен содержать минимум 10 символов");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, description: description.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Не удалось отправить отзыв");
      }
      remember();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setSubmitting(false);
    }
  };

  if (!open || onAdmin) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={() => (done ? setOpen(false) : dismiss())}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        style={{ fontFamily: "var(--font-primary), sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Спасибо за ваш отзыв!</h3>
            <p className="mb-6 text-sm text-slate-600">
              Ваш отзыв отправлен на модерацию. После проверки он появится на странице отзывов.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="btn-primary w-full !rounded-full !px-6 !py-3 !font-bold"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Закрыть"
              className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 pr-6 text-xl font-black text-blue-950">Как вам наша работа? 🐳</h3>
            <p className="mb-5 text-sm text-slate-500">
              Ваш заказ выполнен — поделитесь впечатлением и помогите другим игрокам.
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-slate-700">Ваша оценка</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const filled = (hovered || rating) >= value;
                  return (
                    <button
                      type="button"
                      key={value}
                      onMouseEnter={() => setHovered(value)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(value)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className="h-8 w-8" style={{ color: "#f59e0b" }} fill={filled ? "#f59e0b" : "none"} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-slate-700">Ваш отзыв</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Расскажите о вашем опыте..."
                rows={4}
                className="text-base"
                required
                minLength={10}
                maxLength={1000}
              />
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1 !rounded-full !px-6 !py-3 !font-bold disabled:opacity-50"
              >
                {submitting ? "Отправка..." : "Отправить отзыв"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                disabled={submitting}
                className="rounded-full border-2 border-slate-200 bg-white px-5 py-3 font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
              >
                Позже
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
