"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Cookie, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import {
  COOKIE_CONSENT_CHANGED,
  openCookieSettings,
  readCookieConsent,
  type CookieChoice,
} from "@/components/CookieConsent";
import { confirmDialog } from "@/store/useConfirm";
import ChangePasswordDialog from "./ChangePasswordDialog";
import { SectionCard, SettingRow } from "./ui";

const CONSENT_LABEL: Record<CookieChoice, string> = {
  accepted: "Согласие дано — аналитика включена",
  declined: "Вы отказались — аналитика отключена",
  unset: "Выбор ещё не сделан",
};

export default function SecurityCard({
  hasPassword,
  providers,
  onPasswordChanged,
}: {
  hasPassword: boolean;
  providers: string[];
  onPasswordChanged: () => void;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Rendered client-side only: the value lives in localStorage, so the server
  // has no way to know it and guessing would flash the wrong state.
  const [consent, setConsent] = useState<CookieChoice | null>(null);

  useEffect(() => {
    const sync = () => setConsent(readCookieConsent());
    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGED, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED, sync);
  }, []);

  const signOutConfirmed = async () => {
    const ok = await confirmDialog({
      title: "Выйти из аккаунта?",
      description: "Корзина и заказы сохранятся — вы сможете войти снова в любой момент.",
      confirmLabel: "Выйти",
    });
    if (ok) signOut({ callbackUrl: "/" });
  };

  const loginMethods = ["E-mail и пароль", providers.includes("yandex") ? "Яндекс ID" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <SectionCard
        title="Безопасность и настройки"
        icon={<ShieldCheck className="h-4 w-4 text-[#0B5191]" strokeWidth={2.2} />}
      >
        <div className="flex flex-col">
          <SettingRow
            icon={<KeyRound className="h-4 w-4" strokeWidth={2.2} />}
            title="Пароль"
            subtitle={
              hasPassword
                ? "Используется для входа по e-mail"
                : "Не задан — вход только через Яндекс ID"
            }
          >
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="btn-outline btn-sm"
            >
              {hasPassword ? "Сменить" : "Установить"}
            </button>
          </SettingRow>

          <SettingRow
            icon={<ShieldCheck className="h-4 w-4" strokeWidth={2.2} />}
            title="Способы входа"
            subtitle={hasPassword ? loginMethods : "Яндекс ID"}
          />

          <SettingRow
            icon={<Cookie className="h-4 w-4" strokeWidth={2.2} />}
            title="Cookies и аналитика"
            subtitle={consent ? CONSENT_LABEL[consent] : "Загрузка…"}
          >
            <button type="button" onClick={openCookieSettings} className="btn-outline btn-sm">
              Изменить
            </button>
          </SettingRow>

          <SettingRow
            icon={<LogOut className="h-4 w-4" strokeWidth={2.2} />}
            title="Сессия"
            subtitle="Выйти из аккаунта на этом устройстве"
          >
            <button type="button" onClick={signOutConfirmed} className="btn-outline btn-sm">
              Выйти
            </button>
          </SettingRow>
        </div>

        {notice && (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {notice}
          </p>
        )}
      </SectionCard>

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        hasPassword={hasPassword}
        onSuccess={() => {
          setNotice(hasPassword ? "Пароль изменён." : "Пароль установлен.");
          onPasswordChanged();
          window.setTimeout(() => setNotice(null), 5000);
        }}
      />
    </>
  );
}
