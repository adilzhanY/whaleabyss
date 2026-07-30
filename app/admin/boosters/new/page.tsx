"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CustomInput from "@/components/CustomInput";
import Textarea from "@/components/Textarea";
import PageHeader from "../../_components/PageHeader";

export default function NewBoosterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [inn, setInn] = useState("");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [commissionPercent, setCommissionPercent] = useState(40);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Укажите имя и фамилию");
      return;
    }
    if (inn && !/^\d{12}$/.test(inn.trim())) {
      setError("ИНН должен содержать 12 цифр");
      return;
    }
    if (commissionPercent < 0 || commissionPercent > 100) {
      setError("Комиссия должна быть от 0 до 100%");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/boosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: birthDate ? new Date(birthDate).toISOString() : null,
          telegramUsername: telegramUsername.trim() || null,
          inn: inn.trim() || null,
          payoutDetails: payoutDetails.trim() || null,
          commissionPercent,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при добавлении качера");
      }

      router.push("/admin/boosters");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/boosters"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <PageHeader subtitle="Добавьте исполнителя в реестр" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Имя</label>
              <CustomInput type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Иван" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Фамилия</label>
              <CustomInput type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Петров" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Дата рождения</label>
              <CustomInput type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().split("T")[0]} />
              <p className="text-xs text-slate-500 mt-1">Для проверки 18+</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Telegram</label>
              <CustomInput type="text" value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)} placeholder="@username" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ИНН (самозанятый)</label>
              <CustomInput
                type="text"
                value={inn}
                onChange={(e) => setInn(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="123456789012"
                inputMode="numeric"
                className="font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">12 цифр, нужен для выплат</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Реквизиты для выплат</label>
              <CustomInput type="text" value={payoutDetails} onChange={(e) => setPayoutDetails(e.target.value)} placeholder="Карта или телефон для СБП" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Комиссия качера (%)</label>
            <CustomInput
              type="number"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(Number(e.target.value))}
              min={0}
              max={100}
              className="font-semibold"
            />
            <p className="text-xs text-slate-500 mt-1">Доля от заказа, которая идёт качеру (по умолчанию 40%)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Заметка</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Специализация, рейтинг, любые пометки"
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1 !py-3 !shadow-lg hover:!shadow-xl transition-shadow">
              {loading ? "Добавление..." : "Добавить качера"}
            </button>
            <Link
              href="/admin/boosters"
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
