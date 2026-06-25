"use client";

import { ShoppingBag } from "lucide-react";
import { useAddToCartWithAddons } from "@/components/QuestAddonModal";
import Link from "next/link";
import { ServiceItem } from "@/lib/services";
import { isCategoryOnDiscount, calculateDiscountedPrice, getActiveEvent } from "@/lib/events";
import { parseMinAdventureRank } from "@/lib/adventureRank";

interface ServiceCardProps {
  item: ServiceItem;
  categorySlug?: string;
}

export default function ServiceCard({ item, categorySlug }: ServiceCardProps) {
  const addToCartWithAddons = useAddToCartWithAddons();

  // Check if this category is on discount
  const isOnDiscount = categorySlug ? isCategoryOnDiscount(categorySlug) : false;
  const activeEvent = getActiveEvent();
  const discountedPrice = isOnDiscount && activeEvent
    ? calculateDiscountedPrice(item.price, activeEvent.discountPercent)
    : item.price;
  const finalPrice = isOnDiscount ? discountedPrice : item.price;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Opens the quest-addon modal when the service has linked quests,
    // otherwise adds to the cart directly and opens it.
    addToCartWithAddons(
      {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        price: finalPrice,
        image: item.background || "/images/genshin_background.jpg",
      },
      1,
      parseMinAdventureRank(item.description)
    );
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
      <div className="flex-1 mb-3 sm:mb-4"
        style={{ fontFamily: "var(--font-primary), sans-serif" }}>
        <p className="text-xl sm:text-sm font-medium line-clamp-2 text-slate-700 transition-colors duration-300 group-hover:text-blue-900">
          {item.subtitle}
        </p>
      </div>

      {/* Price + add button */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {isOnDiscount && (
            <span
              className="text-xs sm:text-sm font-semibold line-through text-slate-400"
              style={{ fontFamily: "var(--font-primary), sans-serif" }}
            >
              {item.price.toLocaleString("ru-RU")} ₽
            </span>
          )}
          <div className="flex items-center gap-2">
            <span
              className={`text-base sm:text-2xl font-bold whitespace-nowrap transition-colors duration-300 ${
                isOnDiscount
                  ? "text-green-600 group-hover:text-green-700"
                  : "text-[#1e3a8a] group-hover:text-blue-800"
              }`}
              style={{ fontFamily: "var(--font-primary), sans-serif" }}
            >
              {finalPrice.toLocaleString("ru-RU")} {item.isPerDay ? "₽/день" : "₽"}
            </span>
            {isOnDiscount && (
              <span className="text-xs sm:text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
                -15%
              </span>
            )}
          </div>
        </div>
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