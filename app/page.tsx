import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSiteStats } from "@/lib/siteStats";
import { getBestsellers, getCategoryTiles } from "@/lib/homeShowcase";
import HomeClient from "@/app/HomeClient";
import { Suspense } from "react";
import { generateMetadata as genMeta, generateLocalBusinessSchema, StructuredData } from "@/lib/seo";

export const revalidate = 0;

export const metadata = genMeta({
  title: "Whale Abyss — Профессиональная прокачка аккаунтов Genshin Impact",
  description: "Безопасная и качественная прокачка аккаунтов Genshin Impact. Прохождение Спиральной Бездны, фарм ресурсов, выполнение квестов. Опытные бустеры, доступные цены, гарантия безопасности.",
  keywords: "прокачка аккаунта genshin impact, буст genshin, прохождение бездны, фарм примогемов, whale abyss, прокачка персонажей genshin, буст спиральной бездны",
  canonical: "https://whaleabyss.ru",
});

export default async function Home() {
  // The session is read HERE, on the server, because the auth cookie already
  // arrives with the request — so the very first render (and the RSC payload
  // for a client-side navigation) already knows whether this is a guest or a
  // signed-in customer. Deciding that on the client instead is what made the
  // guest hero flash before being replaced by the dashboard.
  // This costs nothing: the page is already dynamic (`revalidate = 0` above).
  const [session, stats, tiles, bestsellers] = await Promise.all([
    getServerSession(authOptions),
    getSiteStats(),
    getCategoryTiles(),
    getBestsellers(5),
  ]);
  const businessSchema = generateLocalBusinessSchema();

  return (
    <>
      <StructuredData data={businessSchema} />
      <Suspense fallback={<div>Loading...</div>}>
        <HomeClient
          stats={stats}
          tiles={tiles}
          bestsellers={bestsellers}
          initialSession={session}
        />
      </Suspense>
    </>
  );
}
