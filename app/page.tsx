import { getServiceCategories } from "@/lib/services";
import HomeClient from "@/app/HomeClient";
import { Suspense } from "react";
import { generateMetadata as genMeta, generateLocalBusinessSchema, StructuredData } from "@/lib/seo";

export const metadata = genMeta({
  title: "Whale Abyss — Профессиональная прокачка аккаунтов Genshin Impact",
  description: "Безопасная и качественная прокачка аккаунтов Genshin Impact. Прохождение Спиральной Бездны, фарм ресурсов, выполнение квестов. Опытные бустеры, доступные цены, гарантия безопасности.",
  keywords: "прокачка аккаунта genshin impact, буст genshin, прохождение бездны, фарм примогемов, whale abyss, прокачка персонажей genshin, буст спиральной бездны",
  canonical: "https://whaleabyss.ru",
});

export default async function Home() {
  const categories = await getServiceCategories();
  const businessSchema = generateLocalBusinessSchema();

  return (
    <>
      <StructuredData data={businessSchema} />
      <Suspense fallback={<div>Loading...</div>}>
        <HomeClient categories={categories} />
      </Suspense>
    </>
  );
}
