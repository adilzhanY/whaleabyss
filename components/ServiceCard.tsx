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
      className="group flex flex-col rounded-2xl sm:rounded-3xl cursor-pointer col-span-1 transition-transform duration-300 w-full h-full p-3 sm:p-4"
      style={{
        backgroundColor: "#f5f7ff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
      }}
    >
      {/* Image placeholder */}
      <div
        className="mb-3 sm:mb-4 w-full flex items-center justify-center relative overflow-hidden shrink-0 h-30 sm:h-45"
        style={{
          borderRadius: "0.75rem",
          background: item.background
            ? `url('${item.background}') ${item.background.includes('mondstadt_plot.jpg')
              ? 'center 55% / 120% no-repeat'
              : 'center / cover no-repeat'
            }`
            : (item.gradient || "linear-gradient(135deg, #60a5fa 0%, #1e40af 50%, #1e3a8a 100%)"),
        }}
      >
      </div>

      {/* Subtitle */}
      <div className="flex-1 mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm font-medium line-clamp-2" style={{ color: "#334155" }}>
          {item.subtitle}
        </p>
      </div>

      {/* Price + add button */}
      <div className="flex items-center justify-between">
        <span
          className="text-base sm:text-xl font-bold whitespace-nowrap"
          style={{ color: "#1e3a8a", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
        >
          {item.price.toLocaleString("ru-RU")} ₽
        </span>
        <button
          onClick={handleAdd}
          className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: "transparent" }}
          aria-label={`Добавить ${item.title} в корзину`}
        >
          <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: "#8b9fd6" }} strokeWidth={1.5} />
        </button>
      </div>
    </Link>
  );
}