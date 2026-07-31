"use client";

import { useState } from "react";
import { KeyRound, Link2, Unlink, Loader2 } from "lucide-react";
import CustomInput from "@/components/CustomInput";
import CopyableText from "../../_components/CopyableText";
import { confirmDialog } from "@/store/useConfirm";

/**
 * «Доступ в портал» card on /admin/booster/[id]. Links a site account
 * (by email) to this booster: the user's role flips to 'booster' and they can
 * open /portal. The booster registers on the site like a normal customer
 * (captcha + OTP) and tells the admin their email.
 */
export default function PortalAccessCard({
  boosterId,
  initialEmail,
  bare = false,
}: {
  boosterId: string;
  initialEmail: string | null;
  /** Render without the card shell — the page groups it with the documents. */
  bare?: boolean;
}) {
  const [linkedEmail, setLinkedEmail] = useState<string | null>(initialEmail);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/boosters/${boosterId}/link-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось привязать аккаунт");
        return;
      }
      setLinkedEmail(data.email);
      setEmail("");
    } catch {
      setError("Не удалось привязать аккаунт");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    const ok = await confirmDialog({
      title: "Отвязать аккаунт?",
      description: "Качер потеряет доступ к порталу.",
      confirmLabel: "Отвязать",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/boosters/${boosterId}/link-account`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось отвязать аккаунт");
        return;
      }
      setLinkedEmail(null);
    } catch {
      setError("Не удалось отвязать аккаунт");
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <>
      {!bare && (
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-400" />
          Доступ в портал
        </h2>
      )}
      {/* The explanation is onboarding copy — it only helps before the account
          is linked, and for 5 of 7 boosters it already is. */}
      {!linkedEmail && (
        <p className="text-xs text-slate-400 mb-3">
          Качер регистрируется на сайте как обычный пользователь и сообщает вам
          email — привяжите его, и он получит доступ к /portal.
        </p>
      )}

      {error && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {linkedEmail ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs text-slate-400">Привязанный аккаунт</div>
            <CopyableText value={linkedEmail} className="text-sm font-medium text-slate-700" />
          </div>
          <button
            type="button"
            onClick={unlink}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
            Отвязать
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <CustomInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && link()}
              placeholder="email аккаунта качера"
            />
          </div>
          <button
            type="button"
            onClick={link}
            disabled={busy || !email.trim()}
            className="btn-primary !gap-1.5 !px-4 text-sm shrink-0"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Привязать
          </button>
        </div>
      )}
    </>
  );

  if (bare) return body;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">{body}</div>
  );
}