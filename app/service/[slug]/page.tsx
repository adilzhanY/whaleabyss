import { getServiceBySlug } from "@/lib/services";
import { getRecommendedServices } from "@/lib/recommendations";
import { notFound } from "next/navigation";
import ClientServicePage from "./ClientServicePage";
import { generateMetadata as genMeta, generateServiceSchema, StructuredData } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const service = await getServiceBySlug(resolvedParams.slug);

  if (!service) {
    return genMeta({
      title: "Услуга не найдена",
      description: "Запрашиваемая услуга не найдена",
      noindex: true,
    });
  }

  return genMeta({
    title: `${service.title} — Прокачка Genshin Impact`,
    description: service.description || `${service.title}. Профессиональная прокачка аккаунта Genshin Impact. Безопасно, быстро, с гарантией. Цена: ${service.price}₽`,
    keywords: `${service.title}, прокачка genshin, буст genshin impact, ${service.title.toLowerCase()}`,
    ogImage: service.background || undefined,
    canonical: `https://whaleabyss.ru/service/${service.id}`,
  });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const service = await getServiceBySlug(resolvedParams.slug);

  if (!service) {
    return notFound();
  }

  const recommended = await getRecommendedServices(service.id);

  const serviceSchema = generateServiceSchema({
    id: service.id,
    title: service.title,
    description: service.description || service.title,
    price: service.price.toString(),
    imageUrl: service.background || undefined,
  });

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <StructuredData data={serviceSchema} />
      <ClientServicePage service={service} recommended={recommended} />
    </div>
  );
}