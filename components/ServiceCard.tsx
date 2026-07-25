"use client";

import { ShoppingBag, Loader2 } from "lucide-react";
import { useAddToCartWithAddons } from "@/components/QuestAddonModal";
import Link from "next/link";
import { ServiceItem } from "@/lib/services";
import { isCategoryOnDiscount, calculateDiscountedPrice, getActiveEvent } from "@/lib/events";
import { parseMinAdventureRank } from "@/lib/adventureRank";

interface ServiceCardProps {
  item: ServiceItem;
  categorySlug?: string;
}

/**
 * "100%" is an attribute of the service, not part of its name — it was
 * suffixed onto 14 titles and read as repeated noise down the grid. Strip it
 * from the displayed name and surface it as a badge instead.
 */
function splitName(raw: string): { name: string; full: boolean } {
	const m = raw.match(/\s*100\s*%\s*$/);
	return m ? { name: raw.slice(0, m.index).trim(), full: true } : { name: raw, full: false };
}

export default function ServiceCard({ item, categorySlug }: ServiceCardProps) {
  const { name: displayName, full: isHundred } = splitName(item.subtitle || item.title || "");
  const { add: addToCartWithAddons, pending } = useAddToCartWithAddons();

  // Check if this category is on discount
  const isOnDiscount = categorySlug ? isCategoryOnDiscount(categorySlug) : false;
  const activeEvent = getActiveEvent();
  const discountedPrice = isOnDiscount && activeEvent
    ? calculateDiscountedPrice(item.price, activeEvent.discountPercent)
    : item.price;
  const finalPrice = isOnDiscount ? discountedPrice : item.price;

  const handleAdd = (e: React.MouseEvent) => {
    // Per-day services must have their period (startDate/endDate) picked on
    // the detail page — adding straight from the card would create an order
    // with no dates. Let the wrapping Link navigate there instead.
    if (item.isPerDay) return;
    // Always swallow the click — the card is wrapped in a <Link>, so bailing
    // out before preventDefault would navigate away mid-add.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
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
      parseMinAdventureRank(item.description),
      item.hasQuestAddons
    );
  };

  return (
    <Link
      href={`/service/${item.id}`}
      className="service-card group flex flex-col rounded-[14px] cursor-pointer col-span-1 transition-all duration-300 w-full h-full p-3 sm:p-4 border-2 border-transparent relative hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/20"
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
      {/* Name leads, price supports. Previously the name was ~14px muted grey
          and the price 24px navy bold, so the page scanned as a price list and
          the user never learned what they were buying. */}
      <div className="flex-1 mb-3 sm:mb-4 min-w-0"
        style={{ fontFamily: "var(--font-primary), sans-serif" }}>
        <div className="flex items-start gap-1.5">
          <p className="text-[15px] sm:text-base font-semibold leading-snug line-clamp-2 text-slate-900 transition-colors duration-300 group-hover:text-blue-900">
            {displayName}
          </p>
          {isHundred && (
            <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
              100%
            </span>
          )}
        </div>
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
              className={`text-sm sm:text-base font-bold whitespace-nowrap transition-colors duration-300 ${
                isOnDiscount
                  ? "text-green-600 group-hover:text-green-700"
                  : "text-slate-700 group-hover:text-blue-800"
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
          aria-busy={pending}
          className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-transparent cursor-pointer transition-all duration-300 group-hover:bg-blue-600 group-hover:scale-110"
          aria-label={`Добавить ${item.title} в корзину`}
        >
          {pending ? (
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-[#8b9fd6] transition-colors duration-300 group-hover:text-white" strokeWidth={1.5} />
          ) : (
            <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-[#8b9fd6] transition-colors duration-300 group-hover:text-white" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </Link>
  );
}