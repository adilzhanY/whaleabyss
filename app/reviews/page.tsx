"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AuthModal from "@/components/AuthModal";
import Breadcrumb from "@/components/Breadcrumb";

interface Review {
  id: string;
  userId: string | null;
  rating: string;
  description: string;
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
}

export default function ReviewsPage() {
  const { data: session } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [columns, setColumns] = useState<Review[][]>([[], [], []]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    // Recalculate columns when reviews change
    distributeToColumns();
    calculateStats();
  }, [reviews]);

  const calculateStats = () => {
    const counts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const rating = parseFloat(r.rating);
      const roundedDown = Math.floor(rating);
      if (roundedDown >= 1 && roundedDown <= 5) {
        counts[roundedDown]++;
      }
    });
    setTotalReviews(reviews.length);

    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + parseFloat(r.rating), 0);
      setAverageRating(sum / reviews.length);
    } else {
      setAverageRating(0);
    }
  };

  const distributeToColumns = () => {
    const columnCount = 3; // 3 columns
    const newColumns: Review[][] = Array.from({ length: columnCount }, () => []);

    // Distribute reviews in order, filling shortest column first
    reviews.forEach((review) => {
      // Find the shortest column by total height
      let shortestIndex = 0;
      let shortestHeight = Infinity;

      newColumns.forEach((col, idx) => {
        const colHeight = col.reduce((sum, r) => {
          const dims = getCardDimensions(r.description.length);
          return sum + dims.height + 20; // 20px for margin
        }, 0);

        if (colHeight < shortestHeight) {
          shortestHeight = colHeight;
          shortestIndex = idx;
        }
      });

      newColumns[shortestIndex].push(review);
    });

    setColumns(newColumns);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async (offset = 0) => {
    try {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await fetch(`/api/reviews?offset=${offset}&limit=8`);
      const data = await res.json();

      if (offset === 0) {
        setReviews(data.reviews);
      } else {
        setReviews((prev) => [...prev, ...data.reviews]);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    fetchReviews(reviews.length);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-4 w-4 fill-current shrink-0" style={{ color: "#f59e0b" }} />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative h-4 w-4 shrink-0">
          <Star className="h-4 w-4 absolute" style={{ color: "#f59e0b", opacity: 0.3 }} />
          <div className="overflow-hidden absolute" style={{ width: '50%' }}>
            <Star className="h-4 w-4 fill-current" style={{ color: "#f59e0b" }} />
          </div>
        </div>
      );
    }
    return stars;
  };

  const getCardDimensions = (textLength: number) => {
    // Dynamic sizing based on content length
    // Short reviews: compact and can be 1-2 columns wide
    // Medium reviews: standard size
    // Long reviews: taller, can span 2 columns

    if (textLength < 80) {
      return { height: 180, span: 1, priority: 'compact' };
    } else if (textLength < 150) {
      return { height: 240, span: 1, priority: 'small' };
    } else if (textLength < 250) {
      return { height: 300, span: 1, priority: 'medium' };
    } else if (textLength < 400) {
      return { height: 380, span: 2, priority: 'large' };
    } else {
      return { height: 480, span: 2, priority: 'xlarge' };
    }
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
          <Breadcrumb />
          <div className="mb-12 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h1
                className="text-3xl font-black mb-2"
                style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
              >
                Отзывы клиентов
              </h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Более 500 довольных игроков по всей России
              </p>
            </div>
            {session?.user ? (
              <Link
                href="/reviews/new"
                className="btn-primary inline-flex items-center justify-center gap-2 !rounded-xl !px-6 !py-3 !font-bold"
              >
                <Plus className="w-5 h-5" />
                Оставить отзыв
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary inline-flex items-center justify-center gap-2 !rounded-xl !px-6 !py-3 !font-bold"
              >
                <Plus className="w-5 h-5" />
                Оставить отзыв
              </button>
            )}
          </div>

          {/* Statistics Section */}
          <div className="mb-8 flex items-center gap-3">
            <div className="text-5xl font-black" style={{ color: "var(--text-primary)" }}>{averageRating.toFixed(1)}</div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-6 w-6 fill-current"
                  style={{ color: i < Math.floor(averageRating) ? "#f59e0b" : "#e5e7eb" }}
                />
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div
                className="masonry-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.25rem',
                  alignItems: 'start'
                }}
              >
                {columns.map((column, colIndex) => (
                  <div
                    key={colIndex}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem'
                    }}
                  >
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
                            overflow: 'hidden'
                          }}
                            >
                          <div className="mb-4 flex gap-0.5">
                            {renderStars(rating)}
                          </div>
                          <p
                            className="flex-1 leading-relaxed mb-5 italic"
                            style={{
                              color: "var(--text-primary)",
                              fontSize: dimensions.span === 2 ? '1.125rem' : '0.9375rem',
                              lineHeight: dimensions.span === 2 ? '1.75' : '1.6',
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                              hyphens: 'auto'
                            }}
                          >
                            &ldquo;{review.description}&rdquo;
                          </p>
                          <div className="flex items-center gap-3 mt-auto pt-2">
                            <div
                              className="relative shrink-0 overflow-hidden rounded-full bg-slate-200"
                              style={{
                                height: dimensions.span === 2 ? '48px' : '40px',
                                width: dimensions.span === 2 ? '48px' : '40px'
                              }}
                            >
                              {review.userAvatar ? (
                                <img
                                  src={review.userAvatar}
                                  alt={review.userName || 'User'}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div
                                  className="h-full w-full flex items-center justify-center text-slate-500 font-bold"
                                  style={{ fontSize: dimensions.span === 2 ? '1.25rem' : '1rem' }}
                                >
                                  {review.userName ? review.userName[0].toUpperCase() : '?'}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="font-bold truncate"
                                style={{
                                  color: "var(--text-primary)",
                                  fontSize: dimensions.span === 2 ? '1rem' : '0.875rem'
                                }}
                              >
                                {review.userName || 'Аноним'}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {new Date(review.createdAt).toLocaleDateString('ru-RU', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="btn-secondary !rounded-xl !px-8 !py-3.5 !font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? 'Загрузка...' : 'Загрузить ещё отзывы'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
