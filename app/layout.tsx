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
        {/* Yandex.Metrika counter */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
              })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109309287', 'ym');

              ym(109309287, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
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
        {/* /Yandex.Metrika counter */}
      </head>
      <body className={`${primaryFont.variable} ${displayFont.variable} antialiased font-primary`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
