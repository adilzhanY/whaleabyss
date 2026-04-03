import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Whale Abyss — Экспертное сопровождение аккаунтов",
  description: "Безопасно и качественно поможем развить ваш аккаунт Genshin Impact",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${montserrat.variable} ${inter.variable} antialiased font-montserrat`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
