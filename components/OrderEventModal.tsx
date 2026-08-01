"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, CreditCard } from "lucide-react";

export interface OrderEvent {
  type: "paid" | "completed";
  orderId: string;
  items: { title: string; quantity: number }[];
  total: number;
}

/**
 * Celebration modal («Праздник» concept): happy Вэлль popping over the top
 * edge, a status icon, the order's positions, and two actions. Opens with the
 * AuthModal entrance (backdrop fade + rise/scale, 300ms) and is shown exactly
 * once per order — the watcher acks server-side the moment it opens.
 */
export default function OrderEventModal({
  event,
  onClose,
}: {
  event: OrderEvent | null;
  onClose: () => void;
}) {
  const router = useRouter();
  // `current` outlives `event` by 300ms so the exit animation can play.
  const [current, setCurrent] = useState<OrderEvent | null>(null);
  const [animate, setAnimate] = useState(false);

  const isOpen = event !== null;

  useEffect(() => {
    if (event) {
      const mount = setTimeout(() => setCurrent(event), 0);
      const enter = setTimeout(() => setAnimate(true), 20);
      return () => {
        clearTimeout(mount);
        clearTimeout(enter);
      };
    }
    const exit = setTimeout(() => setAnimate(false), 0);
    const unmount = setTimeout(() => setCurrent(null), 300);
    return () => {
      clearTimeout(exit);
      clearTimeout(unmount);
    };
  }, [event]);

  // Body scroll lock, same as the other global modals.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!current) return null;

  const done = current.type === "completed";

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-2xl bg-white p-8 pt-12 text-center shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          animate ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-95 opacity-0"
        }`}
        style={{ fontFamily: "var(--font-primary), sans-serif" }}
        role="dialog"
        aria-modal="true"
        aria-label={done ? "Заказ выполнен" : "Оплата прошла"}
      >
        {/* Вэлль peeking over the top edge */}
        <div className="absolute -top-14 left-1/2 h-[6.5rem] w-[6.5rem] -translate-x-1/2 overflow-hidden rounded-full border-4 border-white bg-[#eaf2f9] shadow-lg">
          <Image
            src="/images/valle_chibi_happy.png"
            alt="Вэлль"
            width={104}
            height={104}
            className="h-full w-full object-cover object-top"
          />
        </div>

        <div
          className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
            done ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
          }`}
        >
          {done ? <Check className="h-6 w-6" strokeWidth={3} /> : <CreditCard className="h-6 w-6" />}
        </div>

        <h3 className="text-2xl font-black tracking-tight text-blue-950">
          {done ? "Ваш заказ выполнен!" : "Оплата прошла!"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {done
            ? "Аккаунт свободен — всё готово, можно заходить"
            : "Заказ передан в работу — прогресс в «Моих заказах»"}
        </p>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left">
          {current.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 text-sm font-semibold text-slate-700">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={3} />
              <span className="min-w-0 truncate">
                {item.title}
                {item.quantity > 1 && <span className="text-slate-400"> ×{item.quantity}</span>}
              </span>
            </div>
          ))}
          {!done && (
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-blue-950">
              <span>Итого</span>
              <span>{current.total.toLocaleString("ru-RU")} ₽</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          {done ? (
            <>
              <button onClick={() => go("/reviews/new")} className="btn-primary flex-1 !font-bold">
                Оставить отзыв
              </button>
              <button onClick={onClose} className="btn-outline flex-1 !font-bold">
                Хорошо
              </button>
            </>
          ) : (
            <>
              <button onClick={() => go("/orders")} className="btn-outline flex-1 !font-bold">
                Мои заказы
              </button>
              <button onClick={onClose} className="btn-primary flex-1 !font-bold">
                Отлично
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
