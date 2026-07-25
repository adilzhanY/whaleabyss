/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/**
 * Cookie / analytics consent banner (opt-out model).
 *
 * Yandex.Metrika is loaded in app/layout.tsx (a real script in the HTML so the
 * tag is verifiable by Yandex). It runs for everyone except visitors who have
 * declined — that head script reads the same consent value this component writes.
 *
 * This component only renders the banner, persists the choice (versioned, so
 * the policy can re-ask later), and clears Metrika's cookies on decline.
 */

const CONSENT_KEY = "wa-cookie-consent";
const CONSENT_VERSION = "1";
const ACCEPTED = `accepted:${CONSENT_VERSION}`;
// NOTE: the literal "declined:1" is duplicated in the layout's Metrika guard —
// keep them in sync if CONSENT_VERSION changes.
const DECLINED = `declined:${CONSENT_VERSION}`;

/** Best-effort removal of Metrika's `_ym_*` cookies after a decline. */
function clearMetrikaCookies() {
  if (typeof document === "undefined") return;
  const host = location.hostname;
  document.cookie.split(";").forEach((entry) => {
    const name = entry.split("=")[0].trim();
    if (!name.startsWith("_ym")) return;
    const expire = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = name + expire;
    document.cookie = name + expire + `; domain=${host}`;
    document.cookie = name + expire + `; domain=.${host}`;
  });
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let choice: string | null = null;
    try {
      choice = localStorage.getItem(CONSENT_KEY);
    } catch {}

    // Show the banner only until a current-version choice exists.
    if (choice !== ACCEPTED && choice !== DECLINED) setShow(true);
  }, []);

  const persist = (value: string) => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {}
  };

  const accept = () => {
    // Metrika is already running (loaded in the layout for non-decliners).
    persist(ACCEPTED);
    setShow(false);
  };

  const decline = () => {
    persist(DECLINED);
    clearMetrikaCookies();
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {/* Phones & tablets: dimmed backdrop behind the modal so it's unmissable. */}
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-hidden="true" />

      {/* Phones/tablets (< lg): centered modal. Desktop (lg+): pinned to the
          bottom-LEFT corner — the right side is occupied by the event banner. */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 lg:inset-auto lg:bottom-4 lg:left-4 lg:block lg:p-0">
        <div
          className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          style={{ fontFamily: "var(--font-primary), sans-serif" }}
        >
          <button
            onClick={decline}
          aria-label="Закрыть и отклонить"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="mb-1.5 pr-6 text-base font-bold" style={{ color: "var(--text-price)" }}>
          Мы используем cookie 🐳
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          Для работы сайта и аналитики (Яндекс.Метрика, включая Вебвизор) мы используем
          файлы cookie. Продолжая пользоваться сайтом, вы соглашаетесь на это. Подробнее в{" "}
          <Link
            href="/privacy"
            className="font-semibold underline hover:opacity-80"
            style={{ color: "var(--text-price)" }}
          >
            Политике конфиденциальности
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="btn-primary flex-1 !py-2.5 !text-sm"
          >
            Принять
          </button>
          <button
            onClick={decline}
            className="flex-1 rounded-full border-2 border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
          >
            Отклонить
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
