"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import Breadcrumb from "@/components/Breadcrumb";
import type { ProfileOverview } from "@/lib/profileOverview";
import ProfileHero from "./_components/ProfileHero";
import { ActiveBoostCard, RecentOrdersCard, StatsRow } from "./_components/OverviewCards";
import PersonalDataCard from "./_components/PersonalDataCard";
import { MyReviewsCard, PromocodeHistoryCard } from "./_components/ActivityCards";
import SecurityCard from "./_components/SecurityCard";
import DangerZone from "./_components/DangerZone";

/**
 * The profile as a real account page: every section is always on screen, and
 * all of it comes from one server-side read (`getProfileOverview`).
 *
 * After any mutation we `router.refresh()` instead of patching local state —
 * the server component re-runs and the whole page reflects the DB, so a stat
 * tile can never disagree with the row it summarises.
 */
export default function ProfileClient({ overview }: { overview: ProfileOverview }) {
  const router = useRouter();
  const { update } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const dataCardRef = useRef<HTMLDivElement>(null);

  const { user, providers, stats, activeBoost, recentOrders, reviews, promocodes } = overview;

  const startEditing = useCallback(() => {
    setEditing(true);
    // The card is far below the hero on mobile; jumping to it makes the
    // hero's «Редактировать» button actually feel like it did something.
    requestAnimationFrame(() => {
      dataCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const handleAvatarUpload = useCallback(
    async (url: string) => {
      await update({ image: url });
      router.refresh();
    },
    [router, update],
  );

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-4xl space-y-4 px-4 sm:px-6">
          <Breadcrumb />

          <ProfileHero
            user={user}
            providers={providers}
            onEdit={startEditing}
            onAvatarUpload={handleAvatarUpload}
          />

          <StatsRow
            completedOrders={stats.completedOrders}
            activeOrders={stats.activeOrders}
            reviewCount={stats.reviewCount}
          />

          {activeBoost && <ActiveBoostCard order={activeBoost} />}

          <RecentOrdersCard orders={recentOrders} />

          <div ref={dataCardRef}>
            <PersonalDataCard
              data={{
                username: user.username,
                email: user.email,
                adventureRank: user.adventureRank,
                telegramUsername: user.telegramUsername,
                receiptEmail: user.receiptEmail,
              }}
              editing={editing}
              onEditingChange={setEditing}
              onSaved={() => router.refresh()}
            />
          </div>

          <MyReviewsCard reviews={reviews} />

          <PromocodeHistoryCard uses={promocodes} />

          <SecurityCard
            hasPassword={user.hasPassword}
            providers={providers}
            onPasswordChanged={() => router.refresh()}
          />

          <DangerZone />
        </div>
      </main>
      <Footer />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
