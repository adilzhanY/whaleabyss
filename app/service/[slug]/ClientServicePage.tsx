"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { ServiceItem } from "@/lib/services";
import { useAddToCartWithAddons } from "@/components/QuestAddonModal";
import { parseMinAdventureRank } from "@/lib/adventureRank";
import { Info, ShoppingCart, Gauge, Loader2, AlertTriangle, MessageCircle, Star, Plus, ArrowRight } from "lucide-react";
import CustomDateRangePicker from "@/components/CustomDateRangePicker";
import ServiceCard from "@/components/ServiceCard";
import Breadcrumb from "@/components/Breadcrumb";

interface ClientServicePageProps {
  service: ServiceItem;
  recommended?: ServiceItem[];
}

/** Shape of GET /api/reviews - the same endpoint /reviews and the home page use. */
interface PageReview {
  id: string;
  rating: string;
  description: string;
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
}

// Same 14px stars as the /reviews cards.
function renderReviewStars(rating: number) {
  const stars = [];
  for (let i = 0; i < Math.floor(rating); i++) {
    stars.push(
      <Star key={i} className="h-3.5 w-3.5 fill-current shrink-0" style={{ color: "#f59e0b" }} />
    );
  }
  if (rating % 1 !== 0) {
    stars.push(
      <div key="half" className="relative h-3.5 w-3.5 shrink-0">
        <Star className="h-3.5 w-3.5 absolute" style={{ color: "#f59e0b", opacity: 0.3 }} />
        <div className="overflow-hidden absolute" style={{ width: "50%" }}>
          <Star className="h-3.5 w-3.5 fill-current" style={{ color: "#f59e0b" }} />
        </div>
      </div>
    );
  }
  return stars;
}

/**
 * Split a service description into three parts.
 *
 * Priorities used to be inverted: the Adventure Rank requirement got the
 * highlighted callout while "стоимость услуги может измениться, если не
 * пройдены мировые квесты" — the single most commercially important sentence
 * on the page — sat buried in grey body copy. The price condition is now the
 * callout; the rank becomes a plain requirements row.
 */
function splitDescription(desc: string | undefined) {
	if (!desc) return { mainText: "", rankNote: null as string | null, priceNote: null as string | null };
	let rest = desc;

	const tidy = (t: string) => {
		let out = t.replace(/\.$/, "").trim();
		if (!out.endsWith(".")) out += ".";
		return out.charAt(0).toUpperCase() + out.slice(1);
	};

	// Rank requirement, e.g. "Исследование территорий доступно с 50 ранга."
	let rankNote: string | null = null;
	const rankMatch = rest.match(/([^.]*доступн[оа]?\s+с\s+\d+\s+ранга[^.]*\.?)/i);
	if (rankMatch) {
		rankNote = tidy(rankMatch[1]);
		rest = rest.replace(rankMatch[1], " ");
	}

	// Price condition — the sentence a buyer must not miss.
	let priceNote: string | null = null;
	const priceMatch = rest.match(/([^.]*стоимость[^.]*(измен|уточня)[^.]*\.?)/i);
	if (priceMatch) {
		priceNote = tidy(priceMatch[1]);
		rest = rest.replace(priceMatch[1], " ");
	}
	// The clarification that usually trails it ("Уточняйте в поддержке…").
	const followUp = rest.match(/([^.]*уточняйте[^.]*\.?)/i);
	if (followUp) {
		if (priceNote) priceNote += " " + tidy(followUp[1]);
		rest = rest.replace(followUp[1], " ");
	}

	const mainText = rest
		.replace(/^[\s.]+/, "")
		.replace(/\s+/g, " ")
		.replace(/\s+\./g, ".")
		.trim();
	return { mainText, rankNote, priceNote };
}

export default function ClientServicePage({ service, recommended = [] }: ClientServicePageProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const { add: addToCartWithAddons, pending: addPending } = useAddToCartWithAddons();
  const { data: session } = useSession();

  // Latest approved reviews for the section below the recommendations. A
  // failed fetch just hides the section - it must never block the page.
  const [pageReviews, setPageReviews] = useState<PageReview[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews?offset=0&limit=6")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && Array.isArray(d?.reviews)) setPageReviews(d.reviews);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Get today and tomorrow as default dates. Format in LOCAL time — for a
  // UTC+ timezone (all of Russia) toISOString() shifts local midnight to the
  // previous UTC day, making «сегодня» render as yesterday in the picker.
  const toLocalYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayDate = new Date();
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const todayYMD = toLocalYMD(todayDate);

  const [startDate, setStartDate] = useState(todayYMD);
  const [endDate, setEndDate] = useState(toLocalYMD(tomorrowDate));

  // Day count is INCLUSIVE of both ends: 28/07 → 29/07 is 2 days, not 1.
  // Both strings are `yyyy-mm-dd`, which Date parses as UTC midnight, so the
  // difference is always a whole number of days (no DST skew to round away).
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  // NaN when either field is mid-edit/empty, and NaN >= 0 is false — so an
  // incomplete range falls back to 1 rather than rendering "NaN дней".
  const hasValidRange = Boolean(startDate) && Boolean(endDate) && timeDiff >= 0;
  const calculatedDays = hasValidRange
    ? Math.round(timeDiff / (1000 * 3600 * 24)) + 1
    : 1;

  // Use calculatedDays if per day, otherwise default to 1
  const activeDays = service.isPerDay ? calculatedDays : 1;
  // A per-day service with no period would reach checkout with empty dates and
  // be rejected there — block it at the button instead.
  const rangeMissing = service.isPerDay && !hasValidRange;

  const pricePerItem = service.price;
  const totalPrice = pricePerItem * activeDays;

  const handleAdd = () => {
    // Opens the quest-addon modal when the service has linked quests,
    // otherwise adds to the cart directly and opens it.
    addToCartWithAddons({
      id: service.id,
      title: service.title,
      subtitle: service.subtitle,
      price: pricePerItem,
      image: service.background || "/images/genshin_background.jpg",
      ...(service.isPerDay ? { startDate, endDate } : {}),
    }, activeDays, parseMinAdventureRank(service.description), service.hasQuestAddons);
  };

  const currentStartDate = startDate;
  const currentEndDate = endDate;

  const { mainText, rankNote, priceNote } = splitDescription(service.description);
  // Real category title from the data — slugs are admin-editable, so a
  // hardcoded slug→label map silently renders nothing the moment one changes
  // (which is exactly what happened on the first pass).
  const categoryLabel = service.categoryTitle ?? null;

  // Services in the "actual" category get a natural-size image layout instead of
  // the fixed 16/10 cover hero. We measure the image's intrinsic size on load and
  // decide whether the price/details panel fits beside it or should stack below.
  const isActual = service.categorySlug === "actual";
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [stack, setStack] = useState(true);
  // Rendered (on-screen) width of the image, so the details card below can match it exactly.
  const [imgWidth, setImgWidth] = useState(0);

  useEffect(() => {
    if (!isActual || !natural) return;
    const PRICE_PANEL = 450; // matches the right column width below
    const GAP = 32; // xl:gap-8
    const decide = () => {
      const containerW = containerRef.current?.offsetWidth ?? 0;
      const isLg = window.innerWidth >= 1024;
      const availForImage = containerW - PRICE_PANEL - GAP;
      // Side-by-side only if there's a desktop-width column AND the image, shown at
      // its natural width, still leaves room for the price panel. Otherwise stack.
      setStack(!(isLg && natural.w > 0 && natural.w <= availForImage));
    };
    decide();
    window.addEventListener("resize", decide);
    return () => window.removeEventListener("resize", decide);
  }, [isActual, natural]);

  // Track the image's actual rendered width via ResizeObserver so the stacked
  // details card can be pinned to the same width.
  useEffect(() => {
    if (!isActual) return;
    const el = imgRef.current;
    if (!el) return;
    const update = () => setImgWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isActual, natural, stack]);

  const actualImage = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={service.background || "/images/genshin_background.jpg"}
      alt={service.subtitle || service.title}
      onLoad={(e) =>
        setNatural({
          w: e.currentTarget.naturalWidth,
          h: e.currentTarget.naturalHeight,
        })
      }
      className="rounded-4xl shadow-sm w-auto h-auto max-w-full"
    />
  );

  // Shared building blocks so the vertical card and the two-column "stack" card
  // (used when an actual-category image is too wide) stay in sync.
  // Was the generic label "Детали Услуги" (also mis-capitalised — Russian
  // sentence case is «Детали услуги»). The best line on the page now carries
  // the service name and its category.
  const heading = (
    <div className="mb-6">
      {categoryLabel && (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: "var(--accent-primary)" }}>
          {categoryLabel}
        </p>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
        {service.subtitle || service.title}
      </h2>
    </div>
  );

  const descriptionBlock = (
    <>
      <div className="text-slate-600 leading-relaxed text-sm sm:text-base mb-5 space-y-4">
        {mainText ? (
          <p>{mainText}</p>
        ) : (
          <p>В данную услугу входит профессиональное выполнение «{service.subtitle}». Наши опытные специалисты обеспечат качественный результат с гарантией безопасности аккаунта.</p>
        )}
      </div>

      {/* Price condition — the sentence that actually costs the buyer money if
          they miss it, so it gets the callout. Icon + tint, no left accent bar:
          that bar is the single most overused generated-UI pattern going. */}
      {priceNote && (
        <div
          className="flex items-start gap-3 px-4 py-3.5 mb-5"
          style={{
            backgroundColor: "rgba(234,179,8,0.10)",
            border: "1px solid rgba(234,179,8,0.35)",
            borderRadius: "var(--r-card)",
          }}
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-sm leading-snug text-slate-700">{priceNote}</p>
        </div>
      )}

      {/* Requirements as a plain list rather than a highlighted box — a rank
          floor is a fact to check, not a warning. */}
      {rankNote && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Требования</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-sm text-slate-600">
              <Gauge className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <span>{rankNote}</span>
            </li>
          </ul>
        </div>
      )}
    </>
  );

  const perDayConfig = service.isPerDay && (
    <div>
      <label className="text-lg font-bold" style={{ color: "var(--text-price)", fontFamily: "var(--font-primary), sans-serif" }}>
        Выберите срок обслуживания: {activeDays} дн.
      </label>
      <div className="flex flex-col gap-4 mt-4">
        {/* One range instead of two independent day fields: the calendar can't
            produce end < start, so the "end before start" state is unreachable
            rather than merely validated after the fact. Not clearable — a
            per-day service has no meaning without a period. */}
        <CustomDateRangePicker
          label="Период обслуживания"
          labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block"
          startDate={currentStartDate}
          endDate={currentEndDate}
          minDate={todayYMD}
          fieldSize="md"
          months={2}
          clearable={false}
          onChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900 leading-tight">
              {activeDays} {activeDays === 1 ? 'день' : activeDays > 1 && activeDays < 5 ? 'дня' : 'дней'}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              По {pricePerItem.toLocaleString("ru-RU")} ₽ за каждый день работы
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const priceRow = (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
        {service.isPerDay ? "ИТОГОВАЯ СТОИМОСТЬ" : "СТОИМОСТЬ"}
      </p>
      <div className="flex items-baseline gap-1" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
        <span className="text-4xl font-bold text-slate-800">{totalPrice.toLocaleString("ru-RU")}</span>
        <span className="text-3xl font-bold text-slate-800">₽</span>
      </div>
    </div>
  );

  const buyButton = (
    <button
      onClick={handleAdd}
      disabled={addPending || rangeMissing}
      aria-busy={addPending}
      className="btn-primary w-full !px-6 !py-4 !text-base flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {addPending ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <ShoppingCart className="w-5 h-5" />
      )}
      <span>
        {addPending
          ? "Добавляем..."
          : rangeMissing
            ? "Выберите период"
            : "Добавить в корзину"}
      </span>
    </button>
  );

  /* The page used to dead-end at one button. A hesitant buyer with a question
     had nowhere to go, and «уточняйте в поддержке» in the price callout above
     pointed at no actual contact. @whaleabyss_official is the support account
     (same one the footer and the suggest-service modal use). */
  const askButton = (
    <a
      href="https://t.me/whaleabyss_official"
      target="_blank"
      rel="noopener noreferrer"
      className="btn-outline mt-2.5 w-full !h-11 !gap-2 !text-sm !font-semibold"
    >
      <MessageCircle className="h-4 w-4" />
      Спросить в Telegram
    </a>
  );

  // Default vertical layout: description, then per-day config, price and button.
  // The heading is included only where this card is the sole title carrier
  // (actual-category layouts) - next to the page H1 it was a duplicate.
  const detailsCard = (withHeading: boolean) => (
    <div className="w-full bg-white rounded-4xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-8 sm:p-10 flex flex-col border border-slate-50">
      {withHeading && heading}
      <div>{descriptionBlock}</div>
      {perDayConfig && <div className="mb-6 border-t border-slate-100 pt-6">{perDayConfig}</div>}
      <div className="border-t border-slate-100 pt-5 flex items-end justify-between mb-6">{priceRow}</div>
      {buyButton}
      {askButton}
    </div>
  );

  // Stack layout (image too wide → details below): description + info on the left,
  // price + button on the right, split by a vertical separator.
  const stackDetailsCard = (
    <div className="w-full bg-white rounded-4xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-8 sm:p-10 flex flex-col sm:flex-row gap-8 border border-slate-50">
      <div className="flex-1 flex flex-col min-w-0">
        {heading}
        {descriptionBlock}
      </div>
      {/* horizontal separator on mobile, vertical on sm+ */}
      <div className="h-px w-full sm:h-auto sm:w-px bg-slate-100 shrink-0" />
      <div className="w-full sm:w-[320px] shrink-0 flex flex-col justify-center items-center text-center">
        {perDayConfig && <div className="mb-6 w-full">{perDayConfig}</div>}
        <div className="mb-6">{priceRow}</div>
        {buyButton}
        {askButton}
      </div>
    </div>
  );

  return (
    <>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 md:pt-32 pb-8 flex flex-col items-center w-full">
        <div className="w-full">
          <Breadcrumb
            items={[
              { label: "Услуги", href: "/services" },
              { label: service.subtitle || service.title, href: `/service/${service.id}` },
            ]}
          />
        </div>
        {isActual ? (
          <div ref={containerRef} className="w-full">
            {stack ? (
              // Image too wide (or narrow screen): center it, details below pinned to
              // the image's rendered width so the card never exceeds the image.
              <div className="w-full flex flex-col items-center">
                {actualImage}
                <div
                  className="mt-8 max-w-full"
                  style={imgWidth ? { width: `${imgWidth}px` } : { width: "100%" }}
                >
                  {stackDetailsCard}
                </div>
              </div>
            ) : (
              // Image leaves room: keep it beside the price/details panel.
              <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6 xl:gap-8 items-start">
                <div className="w-full flex justify-center lg:justify-start">{actualImage}</div>
                <div className="w-full lg:sticky lg:top-24 h-max">{detailsCard(true)}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6 xl:gap-8 items-start">

            {/* Main Visual & Details Column */}
            <div className="flex flex-col gap-6 w-full">
              {/* Real, high-contrast heading above the art. It used to be white
                  text overlaid on a bright sky at poor contrast, which also
                  broke whenever the image changed; and its subline was a slogan
                  ("Whale Abyss Premium Service") sitting in the slot where the
                  category belongs. */}
              <div>
                {categoryLabel && (
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {categoryLabel}
                  </p>
                )}
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900"
                  style={{ fontFamily: "var(--font-primary), sans-serif", textWrap: "balance" }}
                >
                  {service.subtitle || service.title}
                </h1>
              </div>
              <div
                className="w-full rounded-[14px] overflow-hidden relative shadow-sm"
                style={{
                  aspectRatio: "16/10",
                  background: `url('${service.background || "/images/genshin_background.jpg"}') center/cover no-repeat`,
                }}
              >
                {/* No text over the art. The H1 used to sit white-on-bright-sky
                    at poor contrast and broke whenever the image changed; and
                    the subline was a slogan ("Whale Abyss Premium Service") in
                    the slot where the category belongs. Both now live above the
                    image as real, high-contrast text. */}
              </div>

              {/* The two "feature" cards that used to sit here — «Быстрое
                  выполнение» and «Безопасность» — were an icon and a label with
                  no sentence, no number and no proof, costing ~180px and
                  teaching the buyer nothing. Removed rather than restated:
                  an unquantified speed claim is worse than silence, and we have
                  no delivery-time data to back one. See the notes in the PR —
                  bringing them back needs real numbers (start time, срок,
                  guarantee terms) from the business, not filler. */}
            </div>

            {/* Details & Checkout Right Column */}
            <div className="w-full lg:sticky lg:top-24 h-max">{detailsCard(false)}</div>

          </div>
        )}

        {recommended.length > 0 && (
          <section className="w-full mt-14" aria-label="С этим товаром часто покупают">
            <h2
              className="text-2xl font-bold mb-6"
              style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
            >
              С этим товаром часто покупают
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
              {recommended.map((item) => (
                <ServiceCard key={item.id} item={item} categorySlug={item.categorySlug} />
              ))}
            </div>
          </section>
        )}

        {pageReviews.length > 0 && (
          <section className="w-full mt-14" aria-label="Отзывы">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
              >
                Отзывы
              </h2>
              <Link
                href="/reviews"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: "var(--accent-primary)" }}
              >
                Больше отзывов
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pageReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex flex-col rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--accent-border)",
                    boxShadow: "var(--card-shadow)",
                    borderRadius: "1.5rem",
                    overflow: "hidden",
                  }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                      {review.userAvatar ? (
                        <img
                          src={review.userAvatar}
                          alt={review.userName || "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-bold text-slate-500">
                          {review.userName ? review.userName[0].toUpperCase() : "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {review.userName || "Аноним"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {new Date(review.createdAt).toLocaleDateString("ru-RU", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">{renderReviewStars(parseFloat(review.rating))}</div>
                  </div>
                  <p
                    className="flex-1 italic leading-relaxed text-[0.9375rem]"
                    style={{ color: "var(--text-primary)", overflowWrap: "break-word" }}
                  >
                    &ldquo;{review.description}&rdquo;
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              {session?.user ? (
                <Link
                  href="/reviews/new"
                  className="btn-primary inline-flex items-center justify-center gap-2 !px-6 !py-3 !font-bold"
                >
                  <Plus className="h-5 w-5" />
                  Написать отзыв
                </Link>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="btn-primary inline-flex items-center justify-center gap-2 !px-6 !py-3 !font-bold"
                >
                  <Plus className="h-5 w-5" />
                  Написать отзыв
                </button>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}