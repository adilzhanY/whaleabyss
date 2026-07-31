"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Pencil, User } from "lucide-react";
import CustomInput from "@/components/CustomInput";
import { sanitizeTelegram } from "@/lib/validators";
import { DataRow, SectionCard } from "./ui";

export interface PersonalData {
  username: string;
  email: string;
  adventureRank: number | null;
  telegramUsername: string | null;
  receiptEmail: string | null;
}

export default function PersonalDataCard({
  data,
  editing,
  onEditingChange,
  onSaved,
}: {
  data: PersonalData;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSaved: () => void;
}) {
  const { update } = useSession();

  const [name, setName] = useState(data.username);
  const [adventureRank, setAdventureRank] = useState(
    data.adventureRank != null ? String(data.adventureRank) : "",
  );
  const [telegram, setTelegram] = useState(data.telegramUsername ?? "");
  const [receiptEmail, setReceiptEmail] = useState(data.receiptEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed from the server after a successful save (or an external change),
  // so cancelling always restores what is actually stored.
  useEffect(() => {
    if (editing) return;
    setName(data.username);
    setAdventureRank(data.adventureRank != null ? String(data.adventureRank) : "");
    setTelegram(data.telegramUsername ?? "");
    setReceiptEmail(data.receiptEmail ?? "");
    setError(null);
  }, [editing, data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          receiptEmail: receiptEmail.trim(),
          telegramUsername: telegram.trim(),
          adventureRank: adventureRank || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Не удалось сохранить изменения");
        return;
      }
      // Nudge the header to the new name right away. It is only an optimisation
      // — the jwt callback re-reads the row on the next request — so a failure
      // here must not be reported as a failed save. (`update()` also returns
      // undefined when the provider is still loading, hence try/catch.)
      try {
        await update({ name: name.trim() });
      } catch {
        /* self-heals on the next session read */
      }
      onEditingChange(false);
      onSaved();
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Личные данные"
      icon={<User className="h-4 w-4 text-[#0B5191]" strokeWidth={2.2} />}
      action={
        editing ? null : (
          <button
            type="button"
            onClick={() => onEditingChange(true)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 transition-colors hover:text-[#0B5191]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Изменить
          </button>
        )
      }
    >
      {editing ? (
        <form onSubmit={save} className="max-w-xl space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              E-mail (нельзя изменить)
            </label>
            <CustomInput type="email" value={data.email} disabled />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Имя</label>
            <CustomInput
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Ранг приключений
            </label>
            <CustomInput
              type="text"
              inputMode="numeric"
              value={adventureRank}
              onChange={(e) => setAdventureRank(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="Например, 45"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Telegram</label>
            <CustomInput
              type="text"
              value={telegram}
              sanitize={sanitizeTelegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              E-mail для чека
            </label>
            <CustomInput
              type="email"
              value={receiptEmail}
              onChange={(e) => setReceiptEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Сохранение…" : "Сохранить изменения"}
            </button>
            <button
              type="button"
              onClick={() => onEditingChange(false)}
              disabled={saving}
              className="btn-outline"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col">
          <DataRow label="Имя" value={data.username} />
          <DataRow label="E-mail" value={data.email} />
          <DataRow
            label="Ранг приключений"
            value={data.adventureRank != null ? String(data.adventureRank) : null}
          />
          <DataRow label="Telegram" value={data.telegramUsername} />
          <DataRow
            label="E-mail для чека"
            value={data.receiptEmail ?? `${data.email} (основной)`}
          />
        </div>
      )}
    </SectionCard>
  );
}
