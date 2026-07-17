import Link from "next/link";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { asc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import ServiceForm from "../ServiceForm";
import PageHeader from "../../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const cats = await db
    .select({ id: categories.id, title: categories.title, slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.title));

  const actualCategoryId = cats.find((c) => c.slug === "actual")?.id ?? null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
        Услуги
      </Link>

      <PageHeader
        subtitle={
          <>
            Добавьте услугу в каталог. Slug используется как часть URL — пример:{" "}
            <span className="font-mono text-xs">/service/my-service</span>
          </>
        }
      />

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
        <ServiceForm
          initial={{}}
          categories={cats}
          mode="create"
          actualCategoryId={actualCategoryId}
        />
      </div>
    </div>
  );
}
