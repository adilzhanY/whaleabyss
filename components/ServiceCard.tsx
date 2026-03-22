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
      className={`group flex flex-col rounded-3xl cursor-pointer ${item.isWide ? "col-span-1 sm:col-span-2" : "col-span-1"}`}
      style={{
        backgroundColor: "#f5f7ff",
        padding: "1rem",
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
        className="mb-4 w-full flex items-center justify-center relative overflow-hidden"
        style={{
          borderRadius: "1rem",
          aspectRatio: item.isWide ? "21/9" : "4/3",
          background: item.background ? `url('${item.background}') center/cover` : (item.gradient || "linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #4f46e5 100%)"),
          boxShadow: "inset 0 0 0 1000px rgba(0,0,0,0.2)"
        }}
      >
        <span
          className="text-white text-center z-10"
          style={{
            fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: item.isWide ? "1.75rem" : "1.375rem",
            letterSpacing: "0.05em",
            textShadow: "2px 2px 0 rgba(0,0,0,0.5), -1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5)",
            padding: "0 10px"
          }}
        >
          {item.title}
        </span>
      </div>      {/* Subtitle */}
      <div className="flex-1 mb-4">
        <p className="text-sm font-medium" style={{ color: "#334155" }}>
          {item.subtitle}
        </p>
      </div>

      {/* Price + add button */}
      <div className="flex items-center justify-between">
        <span
          className="text-xl font-bold"
          style={{ color: "#1e3a8a", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
        >
          {item.price.toLocaleString("ru-RU")} ₽
        </span>
        <button
          onClick={handleAdd}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: "transparent" }}
          aria-label={`Добавить ${item.title} в корзину`}
        >
          <ShoppingBag className="h-6 w-6" style={{ color: "#8b9fd6" }} strokeWidth={1.5} />
        </button>
      </div>
    </Link>
  );
}
