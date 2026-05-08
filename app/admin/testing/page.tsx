import Link from "next/link";
import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Plus, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTestingPage() {
  const testServices = await db
    .select()
    .from(services)
    .where(eq(services.isTestService, true));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Тестирование</h1>
          <p className="text-sm text-slate-500 mt-1">
            Тестовые услуги для проверки функционала
          </p>
        </div>
        <Link
          href="/admin/testing/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Новая тестовая услуга
        </Link>
      </div>

      {testServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
          Пока нет тестовых услуг.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testServices.map((service) => (
            <div
              key={service.id}
              className="group flex flex-col rounded-2xl sm:rounded-3xl cursor-pointer transition-all duration-300 w-full h-full p-3 sm:p-4 border-2 border-transparent relative hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/20 bg-white"
              style={{
                background: "linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(135deg, rgba(30,58,138,0.4) 0%, rgba(96,165,250,0.4) 100%) border-box",
              }}
            >
              {/* Image placeholder */}
              <div
                className="mb-3 sm:mb-4 w-full flex items-center justify-center relative overflow-hidden shrink-0 h-30 sm:h-45 transition-transform duration-300 group-hover:scale-105"
                style={{
                  borderRadius: "0.75rem",
                  background: service.imageUrl
                    ? `url('${service.imageUrl}') center / cover no-repeat`
                    : "linear-gradient(135deg, #60a5fa 0%, #1e40af 50%, #1e3a8a 100%)",
                }}
              />

              {/* Title/Subtitle */}
              <div className="flex-1 mb-3 sm:mb-4">
                <p className="text-xl sm:text-sm font-medium line-clamp-2 text-slate-700 transition-colors duration-300 group-hover:text-blue-900">
                  {service.subtitle || service.title}
                </p>
              </div>

              {/* Price + icon */}
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-2xl font-bold whitespace-nowrap text-[#1e3a8a] transition-colors duration-300 group-hover:text-blue-800">
                  {Number(service.price).toLocaleString("ru-RU")} ₽
                </span>
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-transparent transition-all duration-300 group-hover:bg-blue-600 group-hover:scale-110">
                  <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-[#8b9fd6] transition-colors duration-300 group-hover:text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
