"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AuthModal from "@/components/AuthModal";
import Breadcrumb from "@/components/Breadcrumb";
import ReviewsMasonry from "@/components/ReviewsMasonry";

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
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
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
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + parseFloat(r.rating), 0);
      setAverageRating(sum / reviews.length);
    } else {
      setAverageRating(0);
    }
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

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="site-gutter flex-1 pt-28 md:pt-32 pb-20">
        <div className="site-container">
          <Breadcrumb />
          <div className="mb-12 text-center">
            <h1
              className="text-4xl sm:text-5xl font-black text-blue-950 mb-4"
              style={{ fontFamily: "var(--font-primary), sans-serif" }}
            >
              Отзывы клиентов
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Более 500 довольных игроков по всей России
            </p>
          </div>

          <div className="mb-8 flex justify-center">
            {session?.user ? (
              <Link
                href="/reviews/new"
                className="btn-primary inline-flex items-center justify-center gap-2 !px-6 !py-3 !font-bold"
              >
                <Plus className="w-5 h-5" />
                Оставить отзыв
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary inline-flex items-center justify-center gap-2 !px-6 !py-3 !font-bold"
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
              <ReviewsMasonry reviews={reviews} />

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="btn-secondary !px-8 !py-3.5 !font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
