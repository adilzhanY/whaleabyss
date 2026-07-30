"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import CustomInput from "@/components/CustomInput";
import Textarea from "@/components/Textarea";
import CustomSelect from "@/components/CustomSelect";

export interface EditableBooster {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  telegramUsername: string | null;
  inn: string | null;
  payoutDetails: string | null;
  commissionPercent: number;
  balance: string;
  status: "active" | "inactive";
  note: string | null;
}

interface EditBoosterModalProps {
  booster: EditableBooster;
  onClose: () => void;
  /** Called with the updated booster row returned by the API. */
  onSaved: (updated: EditableBooster) => void;
}

const toDateInput = (d: string | null) => (d ? new Date(d).toISOString().split("T")[0] : "");

export default function EditBoosterModal({ booster, onClose, onSaved }: EditBoosterModalProps) {
  const [firstName, setFirstName] = useState(booster.firstName);
  const [lastName, setLastName] = useState(booster.lastName);
  const [birthDate, setBirthDate] = useState(toDateInput(booster.birthDate));
  const [telegramUsername, setTelegramUsername] = useState(booster.telegramUsername ?? "");
  const [inn, setInn] = useState(booster.inn ?? "");
  const [payoutDetails, setPayoutDetails] = useState(booster.payoutDetails ?? "");
  const [commissionPercent, setCommissionPercent] = useState(booster.commissionPercent);
  const [balance, setBalance] = useState(booster.balance);
  const [status, setStatus] = useState<"active" | "inactive">(booster.status);
  const [note, setNote] = useState(booster.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
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
      setSaving(true);
      const res = await fetch(`/api/admin/boosters/${booster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: birthDate ? new Date(birthDate).toISOString() : null,
          telegramUsername: telegramUsername.trim() || null,
          inn: inn.trim() || null,
          payoutDetails: payoutDetails.trim() || null,
          commissionPercent,
          balance,
          status,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось сохранить");
      }
      const updated = await res.json();
      onSaved(updated);
      onClose();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
            Редактировать качера
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Имя</label>
              <CustomInput type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Фамилия</label>
              <CustomInput type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Дата рождения</label>
              <CustomInput type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().split("T")[0]} />
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
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Реквизиты для выплат</label>
              <CustomInput type="text" value={payoutDetails} onChange={(e) => setPayoutDetails(e.target.value)} placeholder="Карта или телефон для СБП" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Комиссия (%)</label>
              <CustomInput type="number" value={commissionPercent} onChange={(e) => setCommissionPercent(Number(e.target.value))} min={0} max={100} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Баланс (₽)</label>
              <CustomInput type="number" value={balance} onChange={(e) => setBalance(e.target.value)} min={0} step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Статус</label>
              <CustomSelect
                value={status}
                onChange={(v) => setStatus(v as "active" | "inactive")}
                className="w-full"
                options={[
                  { value: "active", label: "Активен" },
                  { value: "inactive", label: "Неактивен" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Заметка</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full resize-none" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all"
          >
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary !py-2.5 !px-6 disabled:opacity-50">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
