"use client";

import Link from "next/link";
import { MessageSquareQuote, Star, Ticket } from "lucide-react";
import type { ProfilePromocodeUse, ProfileReview } from "@/lib/profileOverview";
import { EmptyState, SectionCard, formatDate, formatMoney, plural } from "./ui";

const REVIEW_STATUS: Record<string, { label: string; classes: string }> = {
  pending: { label: "На модерации", classes: "bg-amber-50 text-amber-700" },
  approved: { label: "Опубликован", classes: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Отклонён", classes: "bg-rose-50 text-rose-700" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Оценка ${rating} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}

export function MyReviewsCard({ reviews }: { reviews: ProfileReview[] }) {
  return (
    <SectionCard
      title="Мои отзывы"
      icon={<MessageSquareQuote className="h-4 w-4 text-[#0B5191]" strokeWidth={2.2} />}
      action={
        reviews.length > 0 ? (
          <Link
            href="/reviews"
            className="text-xs font-bold text-[#0B5191] transition-opacity hover:opacity-75"
          >
            Все отзывы
          </Link>
        ) : null
      }
    >
      {reviews.length === 0 ? (
        <EmptyState
          text="Вы ещё не оставляли отзывов. После выполненного заказа расскажите, как всё прошло."
          ctaLabel="Написать отзыв"
          ctaHref="/reviews"
        />
      ) : (
        <ul className="flex flex-col">
          {reviews.map((review) => {
            const status = REVIEW_STATUS[review.status] ?? REVIEW_STATUS.pending;
            const date = formatDate(review.createdAt, { day: "numeric", month: "long" });
            return (
              <li key={review.id} className="border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Stars rating={Number(review.rating)} />
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.classes}`}
                  >
                    {status.label}
                  </span>
                  {date && <span className="text-[11.5px] text-slate-400">{date}</span>}
                </div>
                <p className="line-clamp-2 text-sm text-slate-600">{review.description}</p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

export function PromocodeHistoryCard({ uses }: { uses: ProfilePromocodeUse[] }) {
  const totalSaved = uses.reduce((sum, use) => sum + (use.saved ?? 0), 0);

  return (
    <SectionCard
      title="Промокоды"
      icon={<Ticket className="h-4 w-4 text-[#0B5191]" strokeWidth={2.2} />}
      action={
        totalSaved > 0 ? (
          <span className="text-xs font-bold text-emerald-600">
            Сэкономлено {formatMoney(totalSaved)}
          </span>
        ) : null
      }
    >
      {uses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-sm text-slate-500">
          Вы пока не использовали промокоды. Они появляются в наших соцсетях и на событиях.
        </p>
      ) : (
        <ul className="flex flex-col">
          {uses.map((use) => {
            const date = formatDate(use.usedAt, { day: "numeric", month: "long", year: "numeric" });
            return (
              <li
                key={use.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 py-2.5 first:border-t-0 first:pt-0"
              >
                <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[12.5px] font-bold tracking-wide text-slate-700">
                  {use.code}
                </code>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#0B5191]">
                  −{use.discountPercent}%
                </span>
                <span className="min-w-0 flex-1 text-[11.5px] text-slate-400">{date}</span>
                {use.saved != null && use.saved > 0 && (
                  <span className="text-sm font-bold tabular-nums text-emerald-600">
                    −{formatMoney(use.saved)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {uses.length > 0 && (
        <p className="mt-3 text-[11.5px] text-slate-400">
          {uses.length} {plural(uses.length, "промокод", "промокода", "промокодов")} за всё время
        </p>
      )}
    </SectionCard>
  );
}
