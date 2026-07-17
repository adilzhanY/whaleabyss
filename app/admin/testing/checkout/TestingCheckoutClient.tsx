"use client";

import { useState } from "react";
import Image from "next/image";
import { CreditCard } from "lucide-react";
import Input from "@/components/Input";
import PageHeader from "../../_components/PageHeader";

interface TestService {
  slug: string;
  title: string;
  subtitle: string | null;
  price: string;
  imageUrl: string | null;
}

/**
 * Payment methods for the ADMIN testing flow only. The public cart still offers
 * SBP only — the card option (FK i=36) lives here while it's being validated.
 */
const PAYMENT_METHODS = [
  { id: 44, label: "СБП", sublabel: "Система быстрых платежей", logo: "/icons/sbp.png" },
  { id: 36, label: "Банковская карта", sublabel: "Карты РФ (Visa / MasterCard / МИР)", logo: null },
] as const;

const COMMISSION_PERCENT = 5;

export default function TestingCheckoutClient({ service }: { service: TestService }) {
  const [adventureRank, setAdventureRank] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("@");
  const [paymentMethod, setPaymentMethod] = useState<number>(44);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = Number(service.price);
  const commission = (price * COMMISSION_PERCENT) / 100;
  const finalTotal = price + commission;

  const handleTelegramChange = (raw: string) => {
    const username = raw.replace(/[^\x00-\x7F]/g, "").replace(/@/g, "");
    setTelegram(`@${username}`);
  };

  const handlePay = async () => {
    const ar = Number(adventureRank);
    if (!adventureRank || !email || telegram.replace("@", "").trim().length === 0) {
      setError("Заполните все поля (Ранг приключений, Email, Telegram)");
      return;
    }
    if (!Number.isInteger(ar) || ar < 1 || ar > 60) {
      setError("Ранг приключений должен быть числом от 1 до 60");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/testing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: service.slug, quantity: 1 }],
          email,
          telegram,
          adventureRank: ar,
          method: paymentMethod,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка при создании заказа");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Платёжная ссылка не получена");
      }
    } catch (e: any) {
      setError(e.message || "Произошла ошибка");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        subtitle={
          <>
            Это реальная оплата (реальное списание) для проверки нового способа оплаты.
            Возврат — через <span className="font-medium">/admin/orders</span>.
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Item */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            {service.imageUrl ? (
              <Image
                src={service.imageUrl}
                alt={service.title}
                width={80}
                height={80}
                className="w-20 h-20 rounded-xl shrink-0 object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center font-black text-[10px] text-white text-center leading-tight"
                style={{ background: "linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)" }}
              >
                {service.title}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 break-words">{service.subtitle || service.title}</p>
              <p className="text-xs text-slate-500 mt-1">1 шт.</p>
            </div>
            <p className="text-xl font-bold text-blue-950">{price.toLocaleString("ru-RU")} ₽</p>
          </div>
        </div>

        {/* Order form */}
        <div className="lg:col-span-5 bg-slate-50/80 rounded-3xl p-6 border border-slate-100 flex flex-col gap-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Ранг приключений:</label>
              <Input type="text" inputMode="numeric" value={adventureRank} onChange={(e) => setAdventureRank(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="Например, 45" className="text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Username в Telegram:</label>
              <Input type="text" value={telegram} onChange={(e) => handleTelegramChange(e.target.value)} placeholder="@username" className="text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">E-mail для чека:</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="text-sm font-medium" />
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-3 border-t border-slate-200 pt-5">
            <h3 className="font-bold text-blue-950">Способ оплаты</h3>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => {
                const selected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                      selected ? "border-blue-900 bg-white shadow-sm" : "border-transparent bg-white/60 hover:bg-white"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-blue-900" : "border-slate-300"}`}>
                      {selected && <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />}
                    </div>
                    {m.logo ? (
                      <Image src={m.logo} alt={m.label} width={48} height={48} className="shrink-0" />
                    ) : (
                      <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-lg bg-blue-50 text-blue-900">
                        <CreditCard className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${selected ? "text-blue-950" : "text-slate-700"}`}>{m.label}</div>
                      <div className="text-xs text-slate-500">{m.sublabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Сумма заказа:</span>
              <span className="text-sm font-semibold text-slate-700">{price.toLocaleString("ru-RU")} ₽</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Комиссия ({COMMISSION_PERCENT}%):</span>
              <span className="text-sm font-semibold text-slate-700">+{commission.toFixed(0)} ₽</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-end justify-between">
              <span className="text-base font-bold text-blue-950">К оплате:</span>
              <span className="text-2xl font-black text-blue-950">{finalTotal.toFixed(0)} ₽</span>
            </div>
            {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}
            <button
              disabled={isLoading}
              onClick={handlePay}
              className="btn-primary w-full mt-2 !py-4"
            >
              {isLoading ? "Обработка..." : "Перейти к оплате"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
