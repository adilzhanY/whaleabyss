"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useRouter } from "next/navigation";

export default function CartModal() {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const total = cartTotal();
  const router = useRouter();

  // For animation
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
    } else {
      setIsAnimating(false);
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  // Keep it always rendered if mounted, to let CSS transitions work properly
  const [shouldRender, setShouldRender] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ease-out ${isAnimating ? "opacity-100" : "opacity-0"}`}
      style={{ pointerEvents: isAnimating ? "auto" : "none", visibility: shouldRender ? "visible" : "hidden" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={closeCart}
      />

      {/* Slide-out panel */}
      <aside
        className={`absolute right-0 top-0 flex h-full w-full flex-col sm:w-105 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isAnimating ? "translate-x-0" : "translate-x-full"}`}
        style={{ backgroundColor: "var(--bg-card)", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--accent-border)" }}
        >
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
          >
            Корзина
          </h2>
          <button
            onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <ShoppingBag className="h-16 w-16" style={{ color: "var(--accent-border)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Ваша корзина пуста
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Добавьте услугу, чтобы начать
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3"
                >
                  {/* Top row: image + title/date */}
                  <div className="flex items-start gap-3">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-xl shrink-0 object-cover"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center font-black text-[10px] text-white text-center leading-tight shadow-inner"
                        style={{ background: "linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)" }}
                      >
                        {item.title}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm break-words">
                        {item.subtitle}
                      </p>
                      {item.startDate && item.endDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(item.startDate).toLocaleDateString("ru-RU")} - {new Date(item.endDate).toLocaleDateString("ru-RU")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: trash | qty | price (matches /cart mobile layout) */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="btn-primary w-8 h-8 flex items-center justify-center !rounded-full !py-0 !px-0 cursor-pointer"
                        aria-label="Уменьшить"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity} шт.</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="btn-primary w-8 h-8 flex items-center justify-center !rounded-full !py-0 !px-0 cursor-pointer"
                        aria-label="Увеличить"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-base font-bold text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="border-t px-6 py-5 space-y-4"
            style={{ borderColor: "var(--accent-border)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Итого
              </span>
              <span className="text-xl font-bold" style={{ color: "var(--text-price)", fontFamily: "var(--font-primary), sans-serif" }}>
                {total.toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <button
              onClick={() => {
                closeCart();
                router.push("/cart");
              }}
              className="btn-primary w-full !py-3 !text-sm"
            >
              Перейти к оплате
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
