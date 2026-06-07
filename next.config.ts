import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 *
 * Shipped in Report-Only mode first: browsers report violations (visible in
 * devtools console) but do NOT block, so the real flows can be validated against
 * live third parties before enforcing. Once the console is clean on those flows,
 * enforce by renaming the header key in headers() from
 * "Content-Security-Policy-Report-Only" to "Content-Security-Policy".
 *
 * Validate these flows before enforcing (they exercise every external origin):
 *   - Homepage           -> Yandex.Metrika + Webvisor (mc.yandex.ru / .com)
 *   - Registration modal -> Yandex SmartCaptcha (smartcaptcha.cloud.yandex.ru)
 *   - Service/cart pages -> S3 images (storage.yandexcloud.net), checkout redirect
 *   - Profile avatar      -> blob:/data: image preview + crop
 *
 * next/font self-hosts the Onest/Space Grotesk fonts at build time, so no
 * external font origin is required. Freekassa checkout is a top-level redirect
 * (window.location), not a frame or cross-origin form post, so it needs no
 * allowance here.
 */
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // 'unsafe-inline' is required for now: the Metrika tag and Next.js hydration
  // emit inline scripts and we are not issuing per-request nonces yet. Upgrading
  // to nonce-based script-src is the next hardening step for full inline-XSS
  // protection.
  "script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://smartcaptcha.cloud.yandex.ru",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://storage.yandexcloud.net https://mc.yandex.ru",
  "font-src 'self' data:",
  "connect-src 'self' https://mc.yandex.ru https://mc.yandex.com https://smartcaptcha.cloud.yandex.ru",
  // 'self' — admin booster-document viewer renders PDFs in a same-origin iframe.
  "frame-src 'self' https://smartcaptcha.cloud.yandex.ru https://*.yandex.ru",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Always-on, low-risk hardening headers (enforced).
 * HSTS deliberately omits includeSubDomains/preload — those are commitments that
 * can brick a non-HTTPS subdomain and are hard to undo. Add them once all
 * subdomains are confirmed HTTPS-only.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  devIndicators: {
    appIsrStatus: false,
  } as any,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.yandexcloud.net',
        pathname: '/whaleabyss-bucket/**',
      },
    ],
  },
  async headers() {
    const rules = [
      { source: "/:path*", headers: securityHeaders },
    ];
    if (isProd) {
      rules.push({
        // Apply the CSP everywhere except the standalone marketing banner, which
        // intentionally loads CDN assets (GSAP, Tailwind CDN, Google Fonts).
        source: "/((?!banner.html).*)",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
        ],
      });
    }
    return rules;
  },
};

export default nextConfig;
