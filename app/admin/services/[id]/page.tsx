import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { services, categories, serviceAddons } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import ServiceForm from "../ServiceForm";
import PageHeader from "../../_components/PageHeader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: PageProps) {
  const { id } = await params;

  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1);

  if (!service) notFound();

  const cats = await db
    .select({ id: categories.id, title: categories.title, slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.title));

  // Quest-addon management (service_addons, addon side): services in
  // «Задания» can be linked to exploration services («Исследование регионов»)
  // so they show up in the quest upsell modal of those regions.
  const missionsCategoryId =
    cats.find((c) => c.slug === "missions")?.id ?? null;
  const locationsCategoryId =
    cats.find((c) => c.slug === "locations")?.id ?? null;
  const actualCategoryId =
    cats.find((c) => c.slug === "actual")?.id ?? null;

  const regionOptions = locationsCategoryId
    ? await db
        .select({
          id: services.id,
          title: services.title,
          subtitle: services.subtitle,
        })
        .from(services)
        .where(eq(services.categoryId, locationsCategoryId))
        .orderBy(asc(services.createdAt))
    : [];

  const parentLinks = await db
    .select({ parentServiceId: serviceAddons.parentServiceId })
    .from(serviceAddons)
    .where(eq(serviceAddons.addonServiceId, id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
        Услуги
      </Link>

      <PageHeader subtitle={service.title} />

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
        <ServiceForm
          mode="edit"
          categories={cats}
          missionsCategoryId={missionsCategoryId}
          actualCategoryId={actualCategoryId}
          regionOptions={regionOptions.map((r) => ({
            id: r.id,
            label: r.subtitle || r.title,
          }))}
          initialParentIds={parentLinks.map((l) => l.parentServiceId)}
          initial={{
            id: service.id,
            slug: service.slug,
            title: service.title,
            subtitle: service.subtitle,
            description: service.description,
            price: service.price,
            imageUrl: service.imageUrl,
            categoryId: service.categoryId,
            featuredInActual: service.featuredInActual,
          }}
        />
      </div>
    </div>
  );
}
