import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

/**
 * UI font — applied to everything by default via the `font-primary` Tailwind
 * utility and the `body` rule in globals.css. To swap the UI font site-wide,
 * change the import above and the loader call below; no other code changes needed.
 */
const primaryFont = Inter({
  variable: "--font-primary",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

/**
 * Display font — used only for the "Whale Abyss" brand mark in the navbar
 * via the `font-display` utility.
 */
const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      <body className={`${primaryFont.variable} ${displayFont.variable} antialiased font-primary`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
