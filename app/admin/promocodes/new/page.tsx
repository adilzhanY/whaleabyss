"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPromocodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(15);
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const upperCode = code.toUpperCase().trim();

    if (upperCode.length < 3 || upperCode.length > 10) {
      setError("Код должен быть от 3 до 10 символов");
      return;
    }

    if (!/^[A-Z0-9]+$/.test(upperCode)) {
      setError("Код может содержать только заглавные буквы и цифры");
      return;
    }

    if (discountPercent < 1 || discountPercent > 100) {
      setError("Скидка должна быть от 1% до 100%");
      return;
    }

    if (!expiresAt) {
      setError("Укажите дату истечения");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/promocodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: upperCode,
          discountPercent,
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при создании промокода");
      }

      router.push("/admin/promocodes");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/promocodes"
          className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
            Новый промокод
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Создайте промокод для скидки
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Код промокода
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="AKS"
              maxLength={10}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-lg font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              От 3 до 10 символов, только заглавные буквы и цифры
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Скидка (%)
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
            <p className="text-xs text-slate-500 mt-1">
              От 1% до 100%
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Действует до
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
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
              className="btn-primary flex-1 !py-3 !rounded-xl !shadow-lg hover:!shadow-xl transition-shadow"
            >
              {loading ? "Создание..." : "Создать промокод"}
            </button>
            <Link
              href="/admin/promocodes"
              className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all text-center shadow-sm hover:shadow"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
