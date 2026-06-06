"use client";

import { useState } from "react";
import { MessageSquare, Pencil, X } from "lucide-react";
import Input from "@/components/Input";

/** Pulls the first `Email:` / `Telegram:` values out of the notes blob. */
function parseContact(notes: string) {
  const email = notes.match(/^Email:\s*(.*)$/im)?.[1]?.trim() ?? "";
  const telegram = notes.match(/^Telegram:\s*(.*)$/im)?.[1]?.trim() ?? "";
  return { email, telegram };
}

export default function CustomerNotesSection({
  orderId,
  notes: initialNotes,
}: {
  orderId: string;
  notes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openEditor = () => {
    const parsed = parseContact(notes);
    setEmail(parsed.email);
    setTelegram(parsed.telegram);
    setError("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), telegram: telegram.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      setNotes(data.userNotes);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" strokeWidth={2.25} />
          Заметки покупателя
        </h2>
        {!editing && (
          <button
            onClick={openEditor}
            title="Изменить Email и Telegram"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Изменить контакты
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              className="text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Telegram</label>
            <Input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
              className="text-sm"
            />
          </div>

          <p className="text-xs text-slate-400">
            Меняются только Email и Telegram. Ранг приключений и промокод не затрагиваются.
          </p>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary !rounded-full !px-5 !py-2.5 !text-sm disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <pre className="text-sm whitespace-pre-wrap font-sans text-slate-700 bg-slate-50 p-4 rounded-2xl">
          {notes}
        </pre>
      )}
    </section>
  );
}
