import type { Metadata } from "next";
import { Onest, Space_Grotesk } from "next/font/google";
import "./globals.css";

/**
 * UI font — applied to everything by default via the `font-primary` Tailwind
 * utility and the `body` rule in globals.css. To swap the UI font site-wide,
 * change the import above and the loader call below; no other code changes needed.
 */
const primaryFont = Onest({
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
import CookieConsent from "@/components/CookieConsent";
import QuestAddonModal from "@/components/QuestAddonModal";

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
      <head>
        {/* Yandex.Metrika counter — rendered into the HTML so Yandex can verify
            the tag. Standard init params (auto-sends the pageview hit). Loads
            for everyone except visitors who explicitly declined cookies
            (opt-out model). The consent key/value mirror components/CookieConsent.tsx. */}
        <script
          id="yandex-metrika"
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try { if (window.localStorage && localStorage.getItem('wa-cookie-consent') === 'declined:1') return; } catch (e) {}
  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for (var j = 0; j < e.scripts.length; j++) {if (e.scripts[j].src === r) { return; }}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109309287', 'ym');
  ym(109309287, 'init', {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true, ecommerce:"dataLayer"});
})();
            `,
          }}
        />
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/109309287"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
      </head>
      <body className={`${primaryFont.variable} ${displayFont.variable} antialiased font-primary`}>
        <Providers>{children}</Providers>
        {/* Banner UI + consent persistence; Metrika itself is loaded above. */}
        <CookieConsent />
        {/* Quest-addon upsell modal — global so every "add to cart" point can open it. */}
        <QuestAddonModal />
      </body>
    </html>
  );
}
