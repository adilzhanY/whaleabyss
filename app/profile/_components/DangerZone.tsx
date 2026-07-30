"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import CustomInput from "@/components/CustomInput";

const CONFIRM_WORD = "удалить";

/**
 * Account deletion, deliberately at the very bottom and behind a typed
 * confirmation. It used to sit one click away from the profile's main screen,
 * next to «Выйти» — two very different consequences on the same row.
 */
export default function DangerZone() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (text.trim().toLowerCase() !== CONFIRM_WORD) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/?deleted=true" });
        return;
      }
      const payload = await res.json().catch(() => ({}));
      setError(payload.error || "Не удалось удалить аккаунт.");
    } catch {
      setError("Ошибка соединения с сервером.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className="border border-red-200 bg-white px-5 py-4 sm:px-6"
      style={{ borderRadius: "var(--r-card)" }}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-sm font-bold text-red-700">Удаление аккаунта</p>
          <p className="text-xs text-slate-500">
            Безвозвратно. Все данные о ваших заказах будут удалены.
          </p>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="btn-danger-soft btn-sm">
            Удалить аккаунт…
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 border-t border-red-100 pt-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Для подтверждения напишите слово «{CONFIRM_WORD}»
          </label>
          <div className="flex max-w-md flex-col gap-3 sm:flex-row">
            <CustomInput
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoFocus
            />
            <button
              type="button"
              onClick={remove}
              disabled={pending || text.trim().toLowerCase() !== CONFIRM_WORD}
              className="btn-danger shrink-0"
            >
              {pending ? "Удаление…" : "Удалить"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setText("");
                setError(null);
              }}
              disabled={pending}
              className="btn-outline shrink-0"
            >
              Отмена
            </button>
          </div>
          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
