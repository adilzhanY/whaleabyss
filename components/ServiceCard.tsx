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
      className="group flex flex-col rounded-2xl sm:rounded-3xl cursor-pointer col-span-1 transition-all duration-300 w-full h-full p-3 sm:p-4 border-2 border-transparent relative hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/20"
      style={{
        background: "linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(135deg, rgba(30,58,138,0.4) 0%, rgba(96,165,250,0.4) 100%) border-box",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = "linear-gradient(#e0f2fe, #e0f2fe) padding-box, linear-gradient(135deg, var(--accent-primary) 0%, #3b82f6 100%) border-box";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = "linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(135deg, rgba(30,58,138,0.4) 0%, rgba(96,165,250,0.4) 100%) border-box";
      }}
    >
      {/* Image placeholder */}
      <div
        className="mb-3 sm:mb-4 w-full flex items-center justify-center relative overflow-hidden shrink-0 h-30 sm:h-45 transition-transform duration-300 group-hover:scale-105"
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
        <p className="text-xs sm:text-sm font-medium line-clamp-2 text-slate-700 transition-colors duration-300 group-hover:text-blue-900">
          {item.subtitle}
        </p>
      </div>

      {/* Price + add button */}
      <div className="flex items-center justify-between">
        <span
          className="text-base sm:text-lg font-bold whitespace-nowrap text-[#1e3a8a] transition-colors duration-300 group-hover:text-blue-800"
          style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
        >
          {item.price.toLocaleString("ru-RU")} {item.isPerDay ? "₽/день" : "₽"}
        </span>
        <button
          onClick={handleAdd}
          className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-transparent transition-all duration-300 group-hover:bg-blue-600 group-hover:scale-110"
          aria-label={`Добавить ${item.title} в корзину`}
        >
          <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-[#8b9fd6] transition-colors duration-300 group-hover:text-white" strokeWidth={1.5} />
        </button>
      </div>
    </Link>
  );
}