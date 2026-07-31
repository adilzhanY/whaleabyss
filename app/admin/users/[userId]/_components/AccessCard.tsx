"use client";

import { useState } from "react";
import { confirmDialog } from "@/store/useConfirm";
import UserCard from "./UserCard";
import { USER_ROLE_LABELS } from "../../../_components/UserRoleChip";
import { shortDate } from "./UserIdentityCard";
import type { UserDetails } from "./types";



function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 text-right font-semibold text-slate-900">{children}</span>
    </div>
  );
}

/**
 * Profile + access facts, and the only mutation on this page: promote/demote
 * between `user` and `admin`. The `booster` role is intentionally NOT offered —
 * it is granted on /admin/booster/[id] together with `boosters.userId`, and a
 * booster-role account without that row can't open /portal at all.
 */
export default function AccessCard({
  user,
  onRoleChanged,
}: {
  user: UserDetails;
  onRoleChanged: (role: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextRole = user.role === "admin" ? "user" : "admin";
  const canSwitch = user.role === "admin" || user.role === "user";

  const changeRole = async () => {
    const ok = await confirmDialog({
      title: nextRole === "admin" ? "Выдать права администратора?" : "Забрать права администратора?",
      description:
        nextRole === "admin"
          ? `${user.username} получит полный доступ к админ-панели, включая заказы, выплаты и промокоды.`
          : `${user.username} потеряет доступ к админ-панели и станет обычным пользователем.`,
      confirmLabel: nextRole === "admin" ? "Выдать доступ" : "Забрать доступ",
      variant: nextRole === "admin" ? "primary" : "danger",
    });
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Не удалось изменить роль");
        return;
      }
      onRoleChanged(nextRole);
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setSaving(false);
    }
  };

  const authLabel =
    [user.hasPassword ? "пароль" : null, ...user.authProviders.map((p) => (p === "yandex" ? "Яндекс ID" : p))]
      .filter(Boolean)
      .join(" + ") || "нет способа входа";

  return (
    <UserCard title="Профиль и доступ">
      <div className="divide-y divide-slate-100">
        <Row label="Вход">{authLabel}</Row>
        {!user.hasPassword && (
          <Row label="Пароль">
            <span className="text-amber-700">не задан</span>
          </Row>
        )}
        <Row label="Telegram">
          {user.telegramUsername ? `@${user.telegramUsername.replace(/^@/, "")}` : "—"}
        </Row>
        <Row label="Ранг приключений">{user.adventureRank ?? "—"}</Row>
        <Row label="Чеки на">
          {user.receiptEmail && user.receiptEmail !== user.email ? (
            <span className="text-amber-700">{user.receiptEmail}</span>
          ) : (
            "тот же e-mail"
          )}
        </Row>
        <Row label="Профиль изменён">{shortDate(user.updatedAt)}</Row>
        <Row label="Роль">
          <span className="inline-flex items-center gap-2">
            {USER_ROLE_LABELS[user.role] ?? user.role}
            {canSwitch && (
              <button
                type="button"
                onClick={changeRole}
                disabled={saving}
                className="btn-outline btn-sm text-[11px]"
              >
                {saving ? "…" : nextRole === "admin" ? "сделать админом" : "снять админа"}
              </button>
            )}
          </span>
        </Row>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </UserCard>
  );
}
