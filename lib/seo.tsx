import { Metadata } from 'next';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonical?: string;
  noindex?: boolean;
}

/**
 * Generate SEO metadata for Next.js pages
 * Usage: export const metadata = generateMetadata({ title: '...', description: '...' });
 */
export function generateMetadata({
  title,
  description,
  keywords,
  ogImage = '/icons/whaleabyss_og_logo.png',
  ogType = 'website',
  canonical,
  noindex = false,
}: SEOProps): Metadata {
  const siteName = 'Whale Abyss';
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://whaleabyss.ru';
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords || 'прокачка аккаунта genshin impact, буст аккаунта, прохождение бездны, genshin буст, whale abyss',
    authors: [{ name: 'Whale Abyss' }],
    robots: noindex ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      type: ogType,
      locale: 'ru_RU',
      url: canonical || siteUrl,
      siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: fullOgImage,
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullOgImage],
    },
    alternates: {
      canonical: canonical || siteUrl,
    },
    other: {
      'yandex-verification': process.env.YANDEX_VERIFICATION || '',
    },
  };
}

/**
 * Generate JSON-LD structured data for Schema.org
 */
export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Whale Abyss',
    description: 'Профессиональные услуги прокачки аккаунтов Genshin Impact',
    url: 'https://whaleabyss.ru',
    logo: 'https://whaleabyss.ru/icons/whaleabyss_og_logo.png',
    image: 'https://whaleabyss.ru/icons/whaleabyss_og_logo.png',
    telephone: '+7 (XXX) XXX-XX-XX',
    priceRange: '₽₽',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RU',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
    },
    sameAs: [
      'https://t.me/whaleabyss',
      'https://www.tiktok.com/@whaleyuureiq',
    ],
  };
}

export function generateServiceSchema(service: {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: service.title,
    name: service.title,
    description: service.description,
    provider: {
      '@type': 'Organization',
      name: 'Whale Abyss',
      url: 'https://whaleabyss.ru',
    },
    offers: {
      '@type': 'Offer',
      price: service.price,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      url: `https://whaleabyss.ru/service/${service.id}`,
    },
    image: service.imageUrl || 'https://whaleabyss.ru/icons/whaleabyss_og_logo.png',
  };
}

export function generateReviewSchema(review: {
  rating: string;
  description: string;
  createdAt: Date;
  username: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: '5',
    },
    author: {
      '@type': 'Person',
      name: review.username,
    },
    reviewBody: review.description,
    datePublished: review.createdAt.toISOString(),
    itemReviewed: {
      '@type': 'Organization',
      name: 'Whale Abyss',
    },
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Component to inject JSON-LD structured data
 */
export function StructuredData({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
