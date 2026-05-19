import { generateMetadata as genMeta, generateLocalBusinessSchema, StructuredData } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Отзывы клиентов о Whale Abyss",
  description: "Реальные отзывы клиентов о прокачке аккаунтов Genshin Impact. Более 500 довольных игроков по всей России. Читайте отзывы о наших услугах буста и прохождения Спиральной Бездны.",
  keywords: "отзывы whale abyss, отзывы прокачка genshin, отзывы буст genshin impact, отзывы прохождение бездны",
  canonical: "https://whaleabyss.ru/reviews",
});

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add LocalBusiness schema with aggregate rating
  const businessSchema = generateLocalBusinessSchema();

  return (
    <>
      <StructuredData data={businessSchema} />
      {children}
    </>
  );
}
