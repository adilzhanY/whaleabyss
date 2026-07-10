"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail, Phone, Send, Clock, BadgeCheck } from "lucide-react";
import { LEGAL, getPartyShortLabel } from "@/lib/legal";

export default function ContactsPage() {
  const [, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h1
              className="text-4xl sm:text-5xl font-black text-blue-950 mb-4"
              style={{ fontFamily: "var(--font-primary), sans-serif" }}
            >
              Контакты поддержки
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Нужна помощь с заказом, возвратом или консультация по услуге — свяжитесь с нами удобным способом.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ContactCard
              icon={Mail}
              label="Электронная почта"
              value={LEGAL.EMAIL}
              href={`mailto:${LEGAL.EMAIL}`}
              hint="Основной канал для вопросов по заказам, возвратам и документам"
            />
            <ContactCard
              icon={Send}
              label="Telegram"
              value={LEGAL.TELEGRAM_HANDLE}
              href={LEGAL.TELEGRAM_URL}
              hint="Оперативные ответы, уведомления по заказам"
            />
            {LEGAL.PHONE && (
              <ContactCard
                icon={Phone}
                label="Телефон"
                value={LEGAL.PHONE}
                href={`tel:${LEGAL.PHONE_TEL}`}
                hint="Для срочных вопросов и голосовой связи"
              />
            )}
            <ContactCard
              icon={Clock}
              label="Часы работы"
              value="Ежедневно, 10:00–22:00 МСК"
              hint="Вне этого времени ответим на email в течение суток"
            />
          </div>

          <div className="mt-10 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Реквизиты исполнителя</h2>
                <p className="text-sm text-slate-500">Для чеков, документов и юридических запросов</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm text-slate-700">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-slate-500 min-w-[140px]">Исполнитель:</dt>
                <dd>{getPartyShortLabel()}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-slate-500 min-w-[140px]">ИНН:</dt>
                <dd className="font-mono">{LEGAL.INN}</dd>
              </div>
              {LEGAL.ADDRESS && !LEGAL.ADDRESS.startsWith("<") && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-slate-500 min-w-[140px]">Адрес:</dt>
                  <dd>{LEGAL.ADDRESS}</dd>
                </div>
              )}
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-slate-500 min-w-[140px]">Налоговый режим:</dt>
                <dd>НПД (Налог на профессиональный доход)</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-slate-500 min-w-[140px]">E-mail:</dt>
                <dd>
                  <a href={`mailto:${LEGAL.EMAIL}`} className="text-blue-600 hover:underline">
                    {LEGAL.EMAIL}
                  </a>
                </dd>
              </div>
            </dl>

            <p className="text-xs text-slate-500 mt-6 leading-relaxed">
              Возврат средств и претензии — направляются на{" "}
              <a href={`mailto:${LEGAL.EMAIL}`} className="text-blue-600 hover:underline">
                {LEGAL.EMAIL}
              </a>{" "}
              с указанием номера заказа. Срок рассмотрения и порядок возврата —
              согласно{" "}
              <a href="/public_offer" className="text-blue-600 hover:underline">
                публичной оферте
              </a>
              .
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
  hint,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  href?: string;
  hint?: string;
}) {
  const body = (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 h-full transition-all hover:border-blue-300 hover:shadow-md">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          {label}
        </div>
      </div>
      <div className="text-base sm:text-lg font-bold text-slate-900 break-all">
        {value}
      </div>
      {hint && <div className="text-xs text-slate-500 mt-1.5">{hint}</div>}
    </div>
  );

  if (!href) return body;
  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="block"
    >
      {body}
    </a>
  );
}
