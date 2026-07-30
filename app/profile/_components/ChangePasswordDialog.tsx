"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CustomInput from "@/components/CustomInput";
import { firstError, passwordSchema, stripNonLatin } from "@/lib/validators";

/**
 * Change an existing password, or set the first one for an account created
 * through Yandex ID (`hasPassword === false`), which previously had no way to
 * get a password other than the forgot-password email flow.
 */
export default function ChangePasswordDialog({
  open,
  onOpenChange,
  hasPassword,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPassword: boolean;
  onSuccess: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setCurrent("");
    setNext("");
    setRepeat("");
    setError(null);
    setPending(false);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    if (next !== repeat) {
      setError("Пароли не совпадают");
      return;
    }
    const invalid = firstError(passwordSchema, next);
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Не удалось изменить пароль");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hasPassword ? "Смена пароля" : "Установка пароля"}</DialogTitle>
          <DialogDescription>
            {hasPassword
              ? "Введите текущий пароль и придумайте новый."
              : "Ваш аккаунт создан через Яндекс ID. Задайте пароль, чтобы входить ещё и по e-mail."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {hasPassword && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Текущий пароль
              </label>
              <CustomInput
                type="password"
                value={current}
                sanitize={stripNonLatin}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Новый пароль
            </label>
            <CustomInput
              type="password"
              value={next}
              sanitize={stripNonLatin}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Повторите новый пароль
            </label>
            <CustomInput
              type="password"
              value={repeat}
              sanitize={stripNonLatin}
              onChange={(e) => setRepeat(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="btn-outline"
            >
              Отмена
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasPassword ? "Сменить пароль" : "Установить пароль"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
