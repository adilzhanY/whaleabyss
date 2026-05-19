import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Пользовательское соглашение",
  description: "Публичная оферта Whale Abyss. Предмет договора, права и обязанности сторон, порядок оплаты и возврата средств.",
  keywords: "пользовательское соглашение, публичная оферта, договор оферты, условия использования",
  canonical: "https://whaleabyss.ru/public_offer",
});

export default function PublicOfferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
