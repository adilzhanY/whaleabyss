import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { services, categories } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import ServiceForm from "../ServiceForm";

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
    .select({ id: categories.id, title: categories.title })
    .from(categories)
    .orderBy(asc(categories.title));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
        Услуги
      </Link>

      <div>
        <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
          Редактирование
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          {service.title}
        </h1>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
        <ServiceForm
          mode="edit"
          categories={cats}
          initial={{
            id: service.id,
            slug: service.slug,
            title: service.title,
            subtitle: service.subtitle,
            description: service.description,
            price: service.price,
            imageUrl: service.imageUrl,
            categoryId: service.categoryId,
          }}
        />
      </div>
    </div>
  );
}
