"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/useCart";
import Link from "next/link";
import { ServiceItem } from "@/lib/services";

interface ServiceCardProps {
  item: ServiceItem;
}

export default function ServiceCard({ item }: ServiceCardProps) {
  const { addToCart, openCart } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      price: item.price,
    });
    openCart();
  };

  return (
    <Link
      href={`/service/${item.id}`}
      className="group relative flex flex-col rounded-xl w-full h-full cursor-pointer overflow-hidden transition-transform duration-300 transform-gpu"
      style={{
        background: item.background ? `url('${item.background}') center/cover no-repeat` : (item.gradient || "linear-gradient(135deg, #60a5fa 0%, #1e40af 50%, #1e3a8a 100%)"),
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
      }}
    >
      {/* Dark gradient overlay roughly 40% from bottom */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/60 to-transparent pointer-events-none"></div>

      {/* Glassmorphism Bottom Card */}
      <div className="mt-auto relative z-10 w-full p-2 sm:p-2.5">
        <div
          className="flex flex-col gap-2.5 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 backdrop-blur-md transition-colors duration-300"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.28)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.18)"
          }}
        >
          {/* Subtitle */}
          <div className="flex-1">
            <p className="text-[15px] sm:text-[17px] font-semibold text-white leading-snug drop-shadow-md">
              {item.subtitle}
            </p>
          </div>

          {/* Price + add button */}
          <div className="flex items-center justify-between mt-1">
            <span
              className="text-lg sm:text-xl font-bold text-white drop-shadow-md"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
            >
              {item.price.toLocaleString("ru-RU")} ₽
            </span>
            <button
              onClick={handleAdd}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white hover:bg-gray-100 transition-colors shadow-sm"
              aria-label={`Добавить ${item.title} в корзину`}
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: "#334155" }} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}