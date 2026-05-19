import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Контакты поддержки",
  description: "Контакты службы поддержки Whale Abyss. Email, Telegram и реквизиты исполнителя для связи и получения документов.",
  keywords: "контакты whale abyss, поддержка, telegram, email, связаться с нами",
  canonical: "https://whaleabyss.ru/contacts",
});

export default function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
