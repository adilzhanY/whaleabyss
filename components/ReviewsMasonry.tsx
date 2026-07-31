"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";

/**
 * The /reviews masonry, extracted verbatim so every surface that lists reviews
 * (/, /service/[slug], /reviews) shows them identically: three balanced
 * columns — each review drops into the currently shortest one, with the height
 * estimated from the text length — and cards that scale their type and avatar
 * with how much the customer actually wrote.
 */

export interface MasonryReview {
  id: string;
  rating: string;
  description: string;
  /** Optional — surfaces that don't have it simply hide the date line. */
  createdAt?: string;
  userName: string | null;
  userAvatar: string | null;
}

/** Estimated card height/emphasis by content length — drives column balance. */
function getCardDimensions(textLength: number) {
  if (textLength < 80) return { height: 180, span: 1 };
  if (textLength < 150) return { height: 240, span: 1 };
  if (textLength < 250) return { height: 300, span: 1 };
  if (textLength < 400) return { height: 380, span: 2 };
  return { height: 480, span: 2 };
}

/** Half-star capable rating row — same 14px stars everywhere. */
function renderStars(rating: number) {
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

export default function ReviewsMasonry({ reviews }: { reviews: MasonryReview[] }) {
  // Shortest-column-first distribution, recomputed when the list changes.
  const columns = useMemo(() => {
    const columnCount = 3;
    const cols: MasonryReview[][] = Array.from({ length: columnCount }, () => []);
    for (const review of reviews) {
      let shortestIndex = 0;
      let shortestHeight = Infinity;
      cols.forEach((col, idx) => {
        const colHeight = col.reduce(
          (sum, r) => sum + getCardDimensions(r.description.length).height + 20,
          0
        );
        if (colHeight < shortestHeight) {
          shortestHeight = colHeight;
          shortestIndex = idx;
        }
      });
      cols[shortestIndex].push(review);
    }
    return cols;
  }, [reviews]);

  return (
    <div
      className="masonry-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1.25rem",
        alignItems: "start",
      }}
    >
      {columns.map((column, colIndex) => (
        <div key={colIndex} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {column.map((review) => {
            const rating = parseFloat(review.rating);
            const dimensions = getCardDimensions(review.description.length);
            return (
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
                  <div
                    className="relative shrink-0 overflow-hidden rounded-full bg-slate-200"
                    style={{
                      height: dimensions.span === 2 ? "48px" : "40px",
                      width: dimensions.span === 2 ? "48px" : "40px",
                    }}
                  >
                    {review.userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={review.userAvatar}
                        alt={review.userName || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center text-slate-500 font-bold"
                        style={{ fontSize: dimensions.span === 2 ? "1.25rem" : "1rem" }}
                      >
                        {review.userName ? review.userName[0].toUpperCase() : "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-bold truncate"
                      style={{
                        color: "var(--text-primary)",
                        fontSize: dimensions.span === 2 ? "1rem" : "0.875rem",
                      }}
                    >
                      {review.userName || "Аноним"}
                    </p>
                    {review.createdAt && (
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {new Date(review.createdAt).toLocaleDateString("ru-RU", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5">{renderStars(rating)}</div>
                </div>
                <p
                  className="flex-1 leading-relaxed italic"
                  style={{
                    color: "var(--text-primary)",
                    fontSize: dimensions.span === 2 ? "1.125rem" : "0.9375rem",
                    lineHeight: dimensions.span === 2 ? "1.75" : "1.6",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    hyphens: "auto",
                  }}
                >
                  &ldquo;{review.description}&rdquo;
                </p>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
