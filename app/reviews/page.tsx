"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AuthModal from "@/components/AuthModal";

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

      const res = await fetch(`/api/reviews?offset=${offset}&limit=5`);
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

  const getGridClass = (textLength: number) => {
    // More balanced grid layout based on text length
    if (textLength > 200) return "md:col-span-2 md:row-span-2";
    if (textLength > 120) return "md:col-span-2";
    return "";
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
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

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ gridAutoFlow: "dense" }}>
                {reviews.map((review) => {
                  const rating = parseFloat(review.rating);
                  const spanClass = getGridClass(review.description.length);

                  return (
                    <div
                      key={review.id}
                      className={`flex flex-col rounded-3xl p-6 ${spanClass}`}
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--accent-border)",
                        boxShadow: "var(--card-shadow)",
                        borderRadius: "2rem"
                      }}
                    >
                      <div className="mb-3 flex gap-0.5">
                        {renderStars(rating)}
                      </div>
                      <p
                        className={`flex-1 leading-relaxed mb-4 italic ${review.description.length > 200 ? 'text-base md:text-lg' : 'text-sm md:text-base'}`}
                        style={{ color: "var(--text-primary)" }}
                      >
                        &ldquo;{review.description}&rdquo;
                      </p>
                      <div className="flex items-center gap-3 mt-auto">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-200">
                          {review.userAvatar ? (
                            <img
                              src={review.userAvatar}
                              alt={review.userName || 'User'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-500 font-bold text-lg">
                              {review.userName ? review.userName[0].toUpperCase() : '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                            {review.userName || 'Аноним'}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
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
