import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { CreditCard, ArrowRight } from "lucide-react";
import TestingClient from "./TestingClient";

export const dynamic = "force-dynamic";

// Real service used to test the new SBP/card payment flow.
const PAYMENT_TEST_SLUG = "tehnicheskoe-obsluzhivanie-akkaunta-47";

export default async function AdminTestingPage() {
  const testServices = await db
    .select()
    .from(services)
    .where(eq(services.isTestService, true));

  const [paymentTestService] = await db
    .select({ slug: services.slug, title: services.title, price: services.price })
    .from(services)
    .where(eq(services.slug, PAYMENT_TEST_SLUG))
    .limit(1);

  return (
    <div className="space-y-8">
      {paymentTestService && (
        <section className="max-w-6xl mx-auto">
          <div className="rounded-3xl border-2 border-blue-200 bg-blue-50/40 p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-blue-950">
                  Тест новой оплаты (СБП + карта РФ)
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Реальная услуга «{paymentTestService.title}» ·{" "}
                  {Number(paymentTestService.price).toLocaleString("ru-RU")} ₽. Создаёт настоящий заказ
                  с пометкой ТЕСТ и реальным списанием.
                </p>
              </div>
            </div>
            <Link
              href="/admin/testing/checkout"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shrink-0"
            >
              Открыть оплату
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </Link>
          </div>
        </section>
      )}

      <TestingClient services={testServices} />
    </div>
  );
}
