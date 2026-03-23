"use client";

import { useState } from "react";
import { useCart } from "@/store/useCart";
import Header from "@/components/Header";
import { Trash2, Info, Eye, CheckCircle2, ChevronRight, Plus, Minus } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, cartTotal } = useCart();
  const [promo, setPromo] = useState("");
  const total = cartTotal();

  // Selected state for the form
  const [replenishMethod, setReplenishMethod] = useState("Заявка");
  const [paymentMethod, setPaymentMethod] = useState("sbp");

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => { }} />

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

            {/* Способ пополнения */}
            <div className="space-y-3">
              <h3 className="font-bold text-blue-950">Способ пополнения</h3>
              <div className="flex items-center gap-3">
                <button
                  className="flex-1 rounded-xl py-3 font-semibold transition-all border border-blue-200 bg-blue-100/50 text-blue-950"
                >
                  Заявка
                </button>
                <div className="flex gap-1.5 items-center text-sm font-medium text-blue-900 cursor-pointer hover:text-blue-800 transition-colors">
                  <Info className="w-4 h-4" />
                  В чём разница?
                </div>
              </div>
            </div>

            {/* Данные */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4 text-blue-800" />
                <span className="text-sm font-semibold text-slate-700">Данные для входа:</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Почта/логин" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                <div className="relative">
                  <input type="password" placeholder="Пароль" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                  <Eye className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 cursor-pointer" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Сервер:</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat pr-10" style={{ backgroundSize: "20px", backgroundPosition: "right 12px center" }} defaultValue="">
                    <option value="eu">Европа</option>
                    <option value="asia">Азия</option>
                    <option value="na">Америка</option>
                    <option value="twhkmo">Тайвань, Гонконг, Макао</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Ник в игре:</label>
                  <input type="text" placeholder="Ник в игре" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1 pb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">E-mail для чека:</label>
                  <input type="email" placeholder="name@example.com" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Для связи:</label>
                  <input type="text" placeholder="@telegram" className="w-full px-4 py-3 rounded-xl border border-white bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400" />
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 border-b border-slate-200 pb-5">
              Чтобы твои покупки сохранились в истории заказов войди в профиль.
            </div>

            {/* Способ оплаты */}
            <div className="space-y-4">
              <h3 className="font-bold text-blue-950">Способ оплаты</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setPaymentMethod("sbp")}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border bg-white transition-all ${paymentMethod === "sbp" ? "border-blue-400 ring-1 ring-blue-400" : "border-slate-100"
                    }`}
                >
                  {paymentMethod === "sbp" && <span className="absolute -top-2 px-2 py-0.5 bg-blue-200 text-blue-800 text-[9px] font-bold rounded-full uppercase">Основной</span>}
                  <div className="w-8 h-8 rounded-full border border-blue-100 flex items-center justify-center mb-1">
                    <span className="text-blue-500 font-bold text-xs" style={{ letterSpacing: '-1px' }}>СБП</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">СБП</span>
                </button>

                <button
                  onClick={() => setPaymentMethod("cards_rf")}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border bg-white transition-all ${paymentMethod === "cards_rf" ? "border-blue-400 ring-1 ring-blue-400" : "border-slate-100"
                    }`}
                >
                  <span className="absolute -top-2 px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-bold rounded-full uppercase">РФ</span>
                  <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center mb-1">
                    <div className="w-4 h-3 bg-blue-500 rounded-sm"></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center leading-tight">Карты / SberPay</span>
                </button>

                <button
                  onClick={() => setPaymentMethod("cards_world")}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border bg-white transition-all ${paymentMethod === "cards_world" ? "border-blue-400 ring-1 ring-blue-400" : "border-slate-100"
                    }`}
                >
                  <span className="absolute -top-2 px-2 py-0.5 bg-blue-200 text-blue-800 text-[9px] font-bold rounded-full uppercase">Зарубежные</span>
                  <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center mb-1">
                    <div className="w-4 h-3 bg-slate-400 rounded-sm"></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Карты</span>
                </button>
              </div>
            </div>

            {/* Промокод */}
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Введите промокод:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Промокод"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  className="w-28 px-3 py-1.5 rounded-lg border border-white bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button className="text-sm font-bold text-blue-950 px-2 py-1 hover:text-blue-950 transition-colors">
                  Применить
                </button>
              </div>
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

              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer mt-1 group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border-2 border-slate-300 group-hover:border-blue-500 mt-0.5 bg-white transition-colors">
                  <input type="checkbox" className="opacity-0 absolute inset-0 cursor-pointer w-full h-full p-0 m-0 z-10" required />
                  <CheckCircle2 className="w-4 h-4 text-blue-900 hidden group-has-checked:block absolute" strokeWidth={3} />
                </div>
                <span className="text-xs text-slate-500 leading-snug">
                  Согласен(а) на обработку персональных данных согласно{' '}
                  <a href="#" className="text-blue-900 hover:underline">Политике конфиденциальности</a>
                </span>
              </label>

              {/* Оформить заказ */}
              <button className="w-full mt-2 py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:shadow-blue-900/30" style={{ backgroundColor: "#4b22b4" }}>
                Оформить заказ
              </button>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
