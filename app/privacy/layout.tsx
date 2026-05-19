import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Политика конфиденциальности",
  description: "Политика конфиденциальности Whale Abyss. Как мы собираем, обрабатываем и защищаем ваши персональные данные в соответствии с 152-ФЗ.",
  keywords: "политика конфиденциальности, защита данных, персональные данные, 152-ФЗ",
  canonical: "https://whaleabyss.ru/privacy",
});

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
