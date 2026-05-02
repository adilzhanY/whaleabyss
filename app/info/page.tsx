"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck, FileText, MessageSquare, ArrowRight } from "lucide-react";
import { LEGAL, getPartyShortLabel } from "@/lib/legal";

export default function InfoPage() {
  const [, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <h1
              className="text-3xl sm:text-4xl font-black mb-3"
              style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
            >
              О сервисе
            </h1>
            <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Правовая информация, условия использования и контакты для связи. Ознакомьтесь перед оформлением заказа.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              href="/privacy"
              icon={ShieldCheck}
              title="Политика конфиденциальности"
              description="Как мы собираем, обрабатываем и защищаем ваши персональные данные в соответствии с 152-ФЗ."
            />
            <InfoCard
              href="/public_offer"
              icon={FileText}
              title="Пользовательское соглашение"
              description="Публичная оферта: предмет договора, права и обязанности сторон, порядок возврата средств."
            />
            <InfoCard
              href="/contacts"
              icon={MessageSquare}
              title="Контакты поддержки"
              description="Email, Telegram и реквизиты исполнителя для связи и документов."
            />
          </div>

          <div className="mt-10 bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-600">
              Услуги оказывает{" "}
              <strong className="text-slate-900">{getPartyShortLabel()}</strong>,{" "}
              ИНН <span className="font-mono">{LEGAL.INN}</span>
              {LEGAL.CURRENT_LEGAL_FORM === "individual_entrepreneur" &&
                LEGAL.OGRNIP &&
                !LEGAL.OGRNIP.startsWith("<") && (
                  <>
                    , ОГРНИП <span className="font-mono">{LEGAL.OGRNIP}</span>
                  </>
                )}
              . Приём платежей осуществляется через защищённые платёжные шлюзы
              банков-партнёров; оплата проходит по защищённому протоколу{" "}
              <strong className="text-slate-900">HTTPS/SSL</strong>, данные банковских
              карт сервис не собирает и не хранит. Подробности — в{" "}
              <Link href="/payment" className="text-blue-600 hover:underline">
                правилах оплаты
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InfoCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-slate-200 p-6 transition-all hover:border-blue-300 hover:shadow-md flex flex-col h-full"
    >
      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
        <Icon className="w-6 h-6" strokeWidth={2.25} />
      </div>
      <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-600 leading-relaxed flex-1">{description}</p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
        Открыть
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </div>
    </Link>
  );
}
