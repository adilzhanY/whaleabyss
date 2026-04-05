"use client";

import { useState } from "react";
import { useCart } from "@/store/useCart";
import Header from "@/components/Header";
import { Trash2, Info, Eye, EyeOff, CheckCircle2, ChevronRight, Plus, Minus } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";
import DataSecurityModal from "@/components/DataSecurityModal";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, cartTotal } = useCart();
  const total = cartTotal();

  // Selected state for the form
  const [replenishMethod, setReplenishMethod] = useState("Заявка");
  const [paymentMethod, setPaymentMethod] = useState("sbp");
  const [isDataSecurityModalOpen, setIsDataSecurityModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => { }} />
      <DataSecurityModal isOpen={isDataSecurityModalOpen} onClose={() => setIsDataSecurityModalOpen(false)} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-900 transition-colors">Главная</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-blue-300">Корзина</span>
        </div>

        <h1 className="text-3xl font-black text-blue-950 mb-8" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
          Корзина
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column - Cart Items */}
          <div className="lg:col-span-7 space-y-4">
            {items.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <p className="text-slate-500 mb-4">Ваша корзина пуста</p>
                <Link href="/" className="inline-flex py-2 px-6 rounded-lg font-bold text-white bg-blue-900 hover:bg-blue-950 transition">
                  Вернуться к услугам
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Minimal Thumbnail representation */}
                    <div className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center font-black text-[10px] text-white text-center leading-tight shadow-inner" style={{ background: "linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)" }}>
                      {item.title}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{item.subtitle}</p>

                      <div className="flex items-center gap-3 mt-3">
                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors" aria-label="Удалить">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-blue-900 hover:border-blue-900 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity} шт.</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-blue-900 hover:border-blue-900 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xl font-bold text-blue-950" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
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
                  <input type="text" placeholder="Ник в игре" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">E-mail для чека:</label>
                  <input type="email" placeholder="name@example.com" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Для связи:</label>
                  <input type="text" placeholder="@telegram" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 border-b border-slate-200 pb-5">
              Чтобы твои покупки сохранились в истории заказов войди в профиль.
            </div>

            {/* Способ оплаты */}
            <div className="space-y-4 border-b border-slate-200 pb-5">
              <h3 className="font-bold text-blue-950">Способ оплаты</h3>
              <p className="text-2xl font-bold text-slate-800 tracking-tight">Оплата в разработке</p>
            </div>

            {/* Итого */}
            <div className="pt-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Итого:</span>
                <span className="text-sm font-semibold text-slate-700">{items.reduce((acc, i) => acc + i.quantity, 0)} шт.</span>
              </div>

              <div className="flex items-end justify-between mt-2">
                <span className="text-base font-bold text-blue-950">Общая стоимость:</span>
                <span className="text-2xl font-black text-blue-950" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  {total.toLocaleString("ru-RU")} ₽
                </span>
              </div>

              {/* Согласие на обработку ПД */}
              <div className="flex items-start gap-3 mt-4">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    id="privacy-policy"
                    type="checkbox"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 cursor-pointer accent-blue-900"
                  />
                </div>
                <div className="text-xs sm:text-sm text-slate-600">
                  <label htmlFor="privacy-policy" className="cursor-pointer font-medium">
                    Оформляя заказ, я соглашаюсь на{' '}
                    <Link href="/privacy" className="text-blue-800 underline hover:text-blue-950 transition-colors">
                      обработку персональных данных
                    </Link>
                  </label>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
