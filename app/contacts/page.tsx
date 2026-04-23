"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail, Phone, Send, Clock, BadgeCheck } from "lucide-react";

export default function ContactsPage() {
  const [, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h1
              className="text-3xl sm:text-4xl font-black mb-3"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              Контакты поддержки
            </h1>
            <p className="text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
              Нужна помощь с заказом, возвратом или консультация по услуге — свяжитесь с нами удобным способом.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ContactCard
              icon={Mail}
              label="Электронная почта"
              value="support@whaleabyss.ru"
              href="mailto:support@whaleabyss.ru"
              hint="Основной канал для вопросов по заказам, возвратам и документам"
            />
            <ContactCard
              icon={Send}
              label="Telegram"
              value="@whaleabyss"
              href="https://t.me/whaleabyss"
              hint="Оперативные ответы, уведомления по заказам"
            />
            <ContactCard
              icon={Phone}
              label="Телефон"
              value="+7 938 408 9608"
              href="tel:+79384089608"
              hint="Для срочных вопросов и голосовой связи"
            />
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
                <dd>Самозанятая Гурова Майя Павловна</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-slate-500 min-w-[140px]">ИНН:</dt>
                <dd className="font-mono">230412509070</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-slate-500 min-w-[140px]">Статус:</dt>
                <dd>Плательщик налога на профессиональный доход (НПД)</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-slate-500 min-w-[140px]">E-mail:</dt>
                <dd>
                  <a href="mailto:support@whaleabyss.ru" className="text-blue-600 hover:underline">
                    support@whaleabyss.ru
                  </a>
                </dd>
              </div>
            </dl>

            <p className="text-xs text-slate-500 mt-6 leading-relaxed">
              Возврат средств и претензии — направляются на{" "}
              <a href="mailto:support@whaleabyss.ru" className="text-blue-600 hover:underline">
                support@whaleabyss.ru
              </a>{" "}
              с указанием номера заказа. Срок рассмотрения — до 7 рабочих дней согласно{" "}
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
