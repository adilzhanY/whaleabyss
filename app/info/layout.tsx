import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "О сервисе Whale Abyss",
  description: "Информация о сервисе прокачки аккаунтов Genshin Impact. Политика конфиденциальности, пользовательское соглашение, контакты поддержки.",
  keywords: "о whale abyss, информация о сервисе, политика конфиденциальности, пользовательское соглашение, контакты",
  canonical: "https://whaleabyss.ru/info",
});

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
