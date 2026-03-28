"use client";

import { useEffect, useState } from "react";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useRouter } from "next/navigation";

export default function CartModal() {
  const { items, isOpen, closeCart, removeFromCart, cartTotal } = useCart();
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
            style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
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
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ backgroundColor: "var(--bg-highlight)", border: "1px solid var(--accent-border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {item.subtitle}
                    </p>
                    <p className="mt-1 text-sm font-bold" style={{ color: "var(--text-price)" }}>
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                      {item.quantity > 1 && (
                        <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-secondary)" }}>
                          × {item.quantity}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
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
              <span className="text-xl font-bold" style={{ color: "var(--text-price)", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                {total.toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <button
              onClick={() => {
                closeCart();
                router.push("/cart");
              }}
              className="w-full rounded-lg py-3 text-sm font-bold text-white transition-colors"
              style={{
                backgroundColor: "var(--accent-primary)",
                borderRadius: "var(--btn-radius)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary)")}
            >
              Перейти к оплате
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
