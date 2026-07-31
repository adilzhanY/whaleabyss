"use client";

import { ShoppingBag, Loader2, CalendarDays, Sparkles } from "lucide-react";
import { Chip } from "@heroui/react";
import { useAddToCartWithAddons } from "@/components/QuestAddonModal";
import Link from "next/link";
import { ServiceItem } from "@/lib/services";
import { isCategoryOnDiscount, calculateDiscountedPrice, getActiveEvent } from "@/lib/events";
import { parseMinAdventureRank } from "@/lib/adventureRank";
import { questRegionLabel } from "@/lib/questRegions";
import QuestCover from "@/components/QuestCover";
import ServiceArtwork from "@/components/ServiceArtwork";

interface ServiceCardProps {
  item: ServiceItem;
  categorySlug?: string;
  /** Among the most-ordered services — see `lib/bestsellers.ts`. */
  isBestseller?: boolean;
}

/**
 * "100%" is an attribute of the service, not part of its name - it was
 * suffixed onto 14 titles and read as repeated noise down the grid. Strip it
 * from the displayed name and surface it as a badge instead.
 */
function splitName(raw: string): { name: string; full: boolean } {
	const m = raw.match(/\s*100\s*%\s*$/);
	return m ? { name: raw.slice(0, m.index).trim(), full: true } : { name: raw, full: false };
}

export default function ServiceCard({ item, categorySlug, isBestseller }: ServiceCardProps) {
  const { name: displayName, full: isHundred } = splitName(item.subtitle || item.title || "");
  const { add: addToCartWithAddons, pending } = useAddToCartWithAddons();
  const minRank = parseMinAdventureRank(item.description);

  // Quest services have no artwork of their own. The card draws a typographic
  // cover live (QuestCover) instead of showing a picture; the generated region
  // tile in `background` stays for every compact surface — including the cart
  // line this card creates below, deliberately.
  //
  // On such a card the name IS the artwork, so printing it again underneath
  // would say the same thing twice. The line is reused for the region instead;
  // it must keep the reserved two-line height, or the price rows stop lining up
  // across a grid row. The category chip is dropped for the same reason: it sits
  // bottom-left, exactly where the cover sets the quest name.
  const hasQuestCover = Boolean(item.questRegion);
  const regionLabel = questRegionLabel(item.questRegion);
  // Square item icons on flat white («Прочее», «Задание легенд»): the picture box
  // is nearly square on a 5-column grid and its edges cut straight through them.
  const containArt = !hasQuestCover && item.imageFit === "contain" && Boolean(item.background);

  // Check if this category is on discount
  const isOnDiscount = categorySlug ? isCategoryOnDiscount(categorySlug) : false;
  const activeEvent = getActiveEvent();
  const discountedPrice = isOnDiscount && activeEvent
    ? calculateDiscountedPrice(item.price, activeEvent.discountPercent)
    : item.price;
  const finalPrice = isOnDiscount ? discountedPrice : item.price;

  const handleAdd = (e: React.MouseEvent) => {
    // Per-day services must have their period (startDate/endDate) picked on
    // the detail page - adding straight from the card would create an order
    // with no dates. Let the wrapping Link navigate there instead.
    if (item.isPerDay) return;
    // Always swallow the click - the card is wrapped in a <Link>, so bailing
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
      minRank,
      item.hasQuestAddons
    );
  };

  return (
    <Link
      href={`/service/${item.id}`}
      className="service-card flex flex-col rounded-[20px] cursor-pointer col-span-1 w-full h-full p-3 sm:p-4 relative"
    >
      {/* Image: category chip anchored bottom-left, discount ribbon top-left */}
      <div
        className="relative mb-3 sm:mb-4 w-full overflow-hidden shrink-0 h-30 sm:h-45"
        style={{
          borderRadius: "0.875rem",
          background: hasQuestCover || containArt
            ? undefined
            : item.background
              ? `url('${item.background}') ${item.background.includes('mondstadt_plot.jpg')
                ? 'center 55% / 120% no-repeat'
                : 'center / cover no-repeat'
              }`
              : (item.gradient || "linear-gradient(135deg, #60a5fa 0%, #1e40af 50%, #1e3a8a 100%)"),
        }}
      >
        {containArt && <ServiceArtwork src={item.background} alt={displayName} />}
        {hasQuestCover ? (
          <QuestCover region={item.questRegion!} name={displayName} />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(9, 14, 23, 0.4), transparent 45%)" }}
          />
        )}
        {/* These three sit on the artwork, so they carry their own colours
            instead of the theme tokens: the image behind them is arbitrary and
            a soft/muted chip would be unreadable on a light screenshot. */}
        {item.categoryTitle && !hasQuestCover && (
          <Chip
            size="sm"
            className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] bg-slate-950/55 text-[10px] font-bold text-white backdrop-blur-sm sm:text-[11px]"
          >
            <Chip.Label className="truncate">{item.categoryTitle}</Chip.Label>
          </Chip>
        )}
        {isOnDiscount && activeEvent && (
          <Chip
            size="sm"
            className="absolute top-2 left-2 bg-red-600 text-[11px] font-extrabold text-white"
          >
            <Chip.Label>-{activeEvent.discountPercent}%</Chip.Label>
          </Chip>
        )}
        {/* Top-right so it never collides with the discount ribbon. */}
        {isBestseller && (
          <Chip
            size="sm"
            className="absolute top-2 right-2 bg-orange-500 text-[10px] font-extrabold text-white shadow-sm sm:text-[11px]"
            title="Одна из самых заказываемых услуг"
          >
            <Sparkles className="h-3 w-3" strokeWidth={2.6} />
            <Chip.Label>Хит</Chip.Label>
          </Chip>
        )}
      </div>

      {/* Name leads, price supports. The name is clamped to two lines with a
          reserved two-line height so the price row sits on the same baseline
          across the whole grid row. */}
      <div className="flex-1 mb-3 sm:mb-4 min-w-0"
        style={{ fontFamily: "var(--font-primary), sans-serif" }}>
        <div className="flex items-start gap-1.5">
          {hasQuestCover ? (
            <p className="min-w-0 flex-1 text-[15px] sm:text-base font-medium leading-snug line-clamp-2 min-h-[2.75em] text-slate-500">
              {regionLabel ? `${regionLabel} · задание` : "Задание"}
            </p>
          ) : (
            <p className="min-w-0 flex-1 text-[15px] sm:text-base font-semibold leading-snug line-clamp-2 min-h-[2.75em] text-slate-900">
              {displayName}
            </p>
          )}
          {/* Solid `default` rather than `soft`: the soft token is 50%
              transparent, which on the white card reads as bare text. */}
          {isHundred && (
            <Chip
              size="sm"
              color="default"
              variant="secondary"
              className="mt-0.5 text-[10px] font-bold text-slate-500"
            >
              <Chip.Label>100%</Chip.Label>
            </Chip>
          )}
        </div>
        {(minRank !== null || item.hasQuestAddons) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {/* A requirement, not a feature: an account below this rank is
                rejected by the checkout AR gate (422), so it reads as a warning
                rather than as another blue info chip. */}
            {minRank !== null && (
              <Chip
                size="sm"
                color="warning"
                variant="soft"
                className="whitespace-nowrap text-[11px] font-bold"
                title={`Нужен ранг приключений ${minRank} или выше`}
              >
                <Chip.Label>Нужен РП {minRank}+</Chip.Label>
              </Chip>
            )}
            {item.hasQuestAddons && (
              <Chip
                size="sm"
                color="default"
                variant="secondary"
                className="whitespace-nowrap text-[11px] font-bold text-slate-600"
              >
                <Chip.Label>Квесты нужны</Chip.Label>
              </Chip>
            )}
          </div>
        )}
      </div>

      {/* Price + CTA. Old price sits inline (not stacked) so a discount never
          changes the card height. The row wraps when the pair doesn't fit
          (e.g. «100 ₽/день» + «Выбрать даты» on narrow columns) - the button
          drops to its own line instead of painting over the price. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <div className="flex items-baseline gap-1.5"
          style={{ fontFamily: "var(--font-primary), sans-serif" }}>
          <span
            className={`text-[15px] font-bold whitespace-nowrap ${
              isOnDiscount ? "text-red-600" : "text-blue-950"
            }`}
          >
            {finalPrice.toLocaleString("ru-RU")} {item.isPerDay ? "₽/день" : "₽"}
          </span>
          {isOnDiscount && (
            <span className="truncate text-xs font-semibold line-through text-slate-400">
              {item.price.toLocaleString("ru-RU")} ₽
            </span>
          )}
        </div>
        <button
          onClick={handleAdd}
          aria-busy={pending}
          className="btn-primary ml-auto shrink-0 !h-8 !gap-1.5 !px-2.5 sm:!px-3 !text-[13px] !font-semibold"
          aria-label={
            item.isPerDay
              ? `Выбрать даты для ${item.title}`
              : `Добавить ${item.title} в корзину`
          }
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : item.isPerDay ? (
            <CalendarDays className="h-4 w-4" strokeWidth={2} />
          ) : (
            <ShoppingBag className="h-4 w-4" strokeWidth={2} />
          )}
          <span className="hidden sm:inline">{item.isPerDay ? "Выбрать даты" : "В корзину"}</span>
        </button>
      </div>
    </Link>
  );
}
