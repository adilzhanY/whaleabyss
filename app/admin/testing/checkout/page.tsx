import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TestingCheckoutClient from "./TestingCheckoutClient";

export const dynamic = "force-dynamic";

// The real "Техническое обслуживание аккаунта" service used to test the new
// SBP/card payment flow.
const TEST_SERVICE_SLUG = "tehnicheskoe-obsluzhivanie-akkaunta-47";

export default async function TestingCheckoutPage() {
  const [service] = await db
    .select({
      slug: services.slug,
      title: services.title,
      subtitle: services.subtitle,
      price: services.price,
      imageUrl: services.imageUrl,
    })
    .from(services)
    .where(eq(services.slug, TEST_SERVICE_SLUG))
    .limit(1);

  return (
    <div className="space-y-6">
      <Link href="/admin/testing" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Назад к тестированию
      </Link>

      {service ? (
        <TestingCheckoutClient service={service} />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
          Услуга <code>{TEST_SERVICE_SLUG}</code> не найдена в базе.
        </div>
      )}
    </div>
  );
}
