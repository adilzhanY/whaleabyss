"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star } from "lucide-react";
import Textarea from "@/components/Textarea";

export default function NewReviewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  if (status === "loading") {
    return (
      <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header onAuthOpen={() => {}} />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session?.user) {
    router.push("/reviews");
    return null;
  }

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

      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setSubmitting(false);
    }
  };

  const renderStarInput = (starValue: number) => {
    const isFilled = (hoveredRating || rating) >= starValue;
    return (
      <button
        type="button"
        key={starValue}
        onMouseEnter={() => setHoveredRating(starValue)}
        onMouseLeave={() => setHoveredRating(0)}
        onClick={() => setRating(starValue)}
        className="transition-transform hover:scale-110"
      >
        <Star
          className="h-8 w-8"
          style={{ color: "#f59e0b" }}
          fill={isFilled ? "#f59e0b" : "none"}
        />
      </button>
    );
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => {}} />

      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "48rem" }}>
          <div className="mb-8">
            <h1
              className="text-3xl font-black mb-2"
              style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
            >
              Оставить отзыв
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Поделитесь своим опытом использования наших услуг
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              className="rounded-3xl p-6 sm:p-8"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--accent-border)",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <div className="mb-6">
                <label className="block text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                  Ваша оценка
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(renderStarInput)}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                  Ваш отзыв
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Расскажите о вашем опыте..."
                  rows={6}
                  className="text-base"
                  required
                  minLength={10}
                  maxLength={1000}
                />
                <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                  Минимум 10 символов, максимум 1000
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary !rounded-full !px-6 !py-3 !font-bold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Отправка..." : "Отправить отзыв"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/reviews")}
                  disabled={submitting}
                  className="btn-secondary !rounded-full !px-6 !py-3 !font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Спасибо за ваш отзыв!
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Ваш отзыв отправлен на модерацию. После проверки он появится на странице отзывов.
            </p>
            <button
              onClick={() => router.push("/reviews")}
              className="btn-primary !rounded-full !px-6 !py-3 !font-bold w-full"
            >
              Вернуться к отзывам
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
