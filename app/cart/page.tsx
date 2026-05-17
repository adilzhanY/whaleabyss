"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/store/useCart";
import Header from "@/components/Header";
import { Trash2, Plus, Minus, Edit2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import DataSecurityModal from "@/components/DataSecurityModal";
import AuthModal from "@/components/AuthModal";
import { useSession } from "next-auth/react";
import Breadcrumb from "@/components/Breadcrumb";

/**
 * Available payment methods. The numeric `id` is the Freekassa method id
 * passed to the SCI redirect as `i=` (see lib/freekassa.ts → FREEKASSA_METHODS).
 * The UI intentionally does NOT mention the aggregator brand or use its logo.
 */
const PAYMENT_METHODS = [
  {
    id: 44,
    label: "СБП",
    sublabel: "Система быстрых платежей",
    logo: "/icons/sbp.png",
  },
] as const;

export default function CartPage() {
  const { data: session } = useSession();
  const { items, removeFromCart, updateQuantity, cartTotal } = useCart();
  const total = cartTotal();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDataSecurityModalOpen, setIsDataSecurityModalOpen] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // Form Fields
  const [inGameName, setInGameName] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");

  const [isEditingInGameName, setIsEditingInGameName] = useState(true);
  const [isEditingEmail, setIsEditingEmail] = useState(true);
  const [isEditingTelegram, setIsEditingTelegram] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/profile")
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            if (data.gameUsername) {
              setInGameName(data.gameUsername);
              setIsEditingInGameName(false);
            }
            if (data.receiptEmail || data.email) {
              setEmail(data.receiptEmail || data.email);
              if (data.receiptEmail) {
                setIsEditingEmail(false);
              }
            }
            if (data.telegramUsername) {
              setTelegram(data.telegramUsername);
              setIsEditingTelegram(false);
            }
          }
        })
        .catch(err => console.error("Failed to load profile", err));
    }
  }, [session]);

  const [paymentMethod, setPaymentMethod] = useState<number>(PAYMENT_METHODS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Promocode state
  const [promocode, setPromocode] = useState("");
  const [appliedPromocode, setAppliedPromocode] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promocodeError, setPromocodeError] = useState<string | null>(null);
  const [isValidatingPromocode, setIsValidatingPromocode] = useState(false);

  // Payment commission (5%)
  const COMMISSION_PERCENT = 5;

  const handleValidatePromocode = async () => {
    if (!session?.user) {
      setPromocodeError("Войдите в систему, чтобы использовать промокод");
      return;
    }

    if (!promocode.trim()) {
      setPromocodeError("Введите промокод");
      return;
    }

    try {
      setIsValidatingPromocode(true);
      setPromocodeError(null);

      const res = await fetch("/api/promocode/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promocode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPromocodeError(data.error || "Ошибка проверки промокода");
        return;
      }

      setAppliedPromocode({ code: data.code, discountPercent: data.discountPercent });
      setPromocodeError(null);
    } catch (err: any) {
      setPromocodeError("Ошибка проверки промокода");
    } finally {
      setIsValidatingPromocode(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = total;
    const discount = appliedPromocode ? (subtotal * appliedPromocode.discountPercent) / 100 : 0;
    const afterDiscount = subtotal - discount;
    const commission = (afterDiscount * COMMISSION_PERCENT) / 100;
    const finalTotal = afterDiscount + commission;

    return { subtotal, discount, afterDiscount, commission, finalTotal };
  };

  const { subtotal, discount, afterDiscount, commission, finalTotal } = calculateTotals();

  const handleCheckout = async () => {
    // Check if user is logged in
    if (!session?.user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!agreedToPrivacy) {
      setError("Необходимо согласиться на обработку персональных данных");
      return;
    }
    if (!inGameName || !email || !telegram) {
      setError("Пожалуйста, заполните все поля (Ник, Email, Telegram)");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          total: afterDiscount,
          email,
          telegram,
          inGameName,
          method: paymentMethod,
          promocode: appliedPromocode?.code || null,
        })
      });

      if (!res.ok) {
        throw new Error("Ошибка при создании заказа");
      }

      const data = await res.json();
      if (data.url) {
        // Redirect into the chosen acquiring channel.
        window.location.href = data.url;
      }
    } catch (e: any) {
      setError(e.message || "Произошла ошибка");
      setIsLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setIsAuthModalOpen(true)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <DataSecurityModal isOpen={isDataSecurityModalOpen} onClose={() => setIsDataSecurityModalOpen(false)} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-8">
        <Breadcrumb />

        <h1 className="text-3xl font-black text-blue-950 mb-8" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
          Корзина
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column - Cart Items */}
          <div className="lg:col-span-7 space-y-4">
            {items.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <p className="text-slate-500 mb-4">Ваша корзина пуста</p>
                <Link href="/" className="btn-primary inline-flex !py-2 !px-6 !rounded-lg !font-bold">
                  Вернуться к услугам
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Service Image */}
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-xl shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center font-black text-[10px] text-white text-center leading-tight shadow-inner" style={{ background: "linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)" }}>
                        {item.title}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">{item.subtitle}</p>
                      {item.startDate && item.endDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(item.startDate).toLocaleDateString("ru-RU")} - {new Date(item.endDate).toLocaleDateString("ru-RU")}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3">
                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer" aria-label="Удалить">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="btn-primary w-8 h-8 flex items-center justify-center !rounded-full !py-0 !px-0 cursor-pointer">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity} шт.</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="btn-primary w-8 h-8 flex items-center justify-center !rounded-full !py-0 !px-0 cursor-pointer">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xl font-bold text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column - Order Form */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-3xl p-6 sm:p-8 border border-slate-100 flex flex-col gap-6 shadow-sm">

            {/* Данные */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Ник в игре:</label>
                  {isEditingInGameName ? (
                    <input type="text" value={inGameName} onChange={e => setInGameName(e.target.value)} placeholder="Ник в игре" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                  ) : (
                    <div className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-transparent bg-slate-100/50 text-sm font-semibold text-slate-700">
                      <span className="truncate">{inGameName}</span>
                      <button onClick={() => setIsEditingInGameName(true)} className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer ml-2 shrink-0">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Для связи:</label>
                  {isEditingTelegram ? (
                    <input type="text" value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@telegram" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                  ) : (
                    <div className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-transparent bg-slate-100/50 text-sm font-semibold text-slate-700">
                      <span className="truncate">{telegram}</span>
                      <button onClick={() => setIsEditingTelegram(true)} className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer ml-2 shrink-0">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">E-mail для чека:</label>
                  {isEditingEmail ? (
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                  ) : (
                    <div className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-transparent bg-slate-100/50 text-sm font-semibold text-slate-700">
                      <span className="truncate">{email}</span>
                      <button onClick={() => setIsEditingEmail(true)} className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer ml-2 shrink-0">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 border-b border-slate-200 pb-5">
              Чтобы твои покупки сохранились в истории заказов войди в профиль.
            </div>

            {/* Промокод */}
            <div className="space-y-3 border-b border-slate-200 pb-5">
              <h3 className="font-bold text-blue-950">Промокод</h3>
              {appliedPromocode ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-800">
                      {appliedPromocode.code} применён
                    </p>
                    <p className="text-xs text-green-600">
                      Скидка {appliedPromocode.discountPercent}%
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAppliedPromocode(null);
                      setPromocode("");
                    }}
                    className="text-xs font-semibold text-green-700 hover:text-green-900 underline"
                  >
                    Удалить
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promocode}
                      onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                      placeholder="Введите промокод"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                      onClick={handleValidatePromocode}
                      disabled={isValidatingPromocode || !promocode.trim()}
                      className="btn-primary !px-4 !py-3 !rounded-xl"
                    >
                      {isValidatingPromocode ? "..." : "Применить"}
                    </button>
                  </div>
                  {promocodeError && (
                    <p className="text-xs text-red-600 font-semibold">{promocodeError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Способ оплаты */}
            <div className="space-y-3 border-b border-slate-200 pb-5">
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
                        selected
                          ? "border-blue-900 bg-white shadow-sm"
                          : "border-transparent bg-white/60 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? "border-blue-900" : "border-slate-300"
                        }`}
                      >
                        {selected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />
                        )}
                      </div>
                      <Image
                        src={m.logo}
                        alt={m.label}
                        width={56}
                        height={56}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-bold transition-colors ${
                            selected ? "text-blue-950" : "text-slate-700"
                          }`}
                        >
                          {m.label}
                        </div>
                        <div className="text-xs text-slate-500">{m.sublabel}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Итого */}
            <div className="pt-2 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Товары:</span>
                <span className="text-sm font-semibold text-slate-700">{items.reduce((acc, i) => acc + i.quantity, 0)} шт.</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Сумма заказа:</span>
                <span className="text-sm font-semibold text-slate-700">
                  {subtotal.toLocaleString("ru-RU")} ₽
                </span>
              </div>

              {appliedPromocode && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Скидка ({appliedPromocode.discountPercent}%):</span>
                  <span className="text-sm font-semibold text-green-600">
                    -{discount.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Комиссия (5%):</span>
                <span className="text-sm font-semibold text-slate-700">
                  +{commission.toFixed(0)} ₽
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-end justify-between">
                <span className="text-base font-bold text-blue-950">К оплате:</span>
                <span className="text-2xl font-black text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
                  {finalTotal.toFixed(0)} ₽
                </span>
              </div>

              {/* Согласие на обработку ПД */}
              <div className="checkbox-wrapper-65 mt-4">
                <label htmlFor="privacy-policy" className="flex items-start gap-2">
                  <input
                    id="privacy-policy"
                    type="checkbox"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  />
                  <span className="cbx">
                    <svg width="12px" height="11px" viewBox="0 0 12 11">
                      <polyline points="1 6.29411765 4.5 10 11 1"></polyline>
                    </svg>
                  </span>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium">
                    Оформляя заказ, я соглашаюсь на{' '}
                    <Link href="/privacy" className="text-blue-800 underline hover:text-blue-950 transition-colors">
                      обработку персональных данных
                    </Link>
                  </span>
                </label>
              </div>
              <style jsx>{`
                .checkbox-wrapper-65 *,
                .checkbox-wrapper-65 ::after,
                .checkbox-wrapper-65 ::before {
                  box-sizing: border-box;
                }
                .checkbox-wrapper-65 .cbx {
                  position: relative;
                  display: block;
                  width: 18px;
                  height: 18px;
                  flex-shrink: 0;
                  border-radius: 4px;
                  background-color: #606062;
                  background-image: linear-gradient(#474749, #606062);
                  box-shadow: inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.15);
                  transition: all 0.15s ease;
                }
                .checkbox-wrapper-65 .cbx svg {
                  position: absolute;
                  top: 3px;
                  left: 3px;
                  fill: none;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                  stroke: #fff;
                  stroke-width: 2;
                  stroke-dasharray: 17;
                  stroke-dashoffset: 17;
                  transform: translate3d(0, 0, 0);
                }
                .checkbox-wrapper-65 {
                  user-select: none;
                }
                .checkbox-wrapper-65 label {
                  cursor: pointer;
                }
                .checkbox-wrapper-65 input[type="checkbox"] {
                  display: none;
                  visibility: hidden;
                }
                .checkbox-wrapper-65 input[type="checkbox"]:checked + .cbx {
                  background-color: #606062;
                  background-image: linear-gradient(#255cd2, #1d52c1);
                }
                .checkbox-wrapper-65 input[type="checkbox"]:checked + .cbx svg {
                  stroke-dashoffset: 0;
                  transition: all 0.15s ease;
                }
              `}</style>
              {error && (
                <div className="text-red-500 text-sm font-semibold">{error}</div>
              )}
              <button
                disabled={isLoading || items.length === 0}
                onClick={handleCheckout}
                className="btn-primary w-full mt-4 !py-4 !rounded-xl"
              >
                {isLoading ? "Обработка..." : "Перейти к оплате"}
              </button>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
