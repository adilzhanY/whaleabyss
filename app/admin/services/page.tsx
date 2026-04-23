import Link from "next/link";
import { db } from "@/lib/db";
import { services, categories } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { Plus, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const rows = await db
    .select({
      id: services.id,
      slug: services.slug,
      title: services.title,
      price: services.price,
      imageUrl: services.imageUrl,
      category: categories.title,
      updatedAt: services.updatedAt,
    })
    .from(services)
    .leftJoin(categories, eq(services.categoryId, categories.id))
    .orderBy(desc(services.updatedAt));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Услуги</h1>
          <p className="text-sm text-slate-500 mt-1">{rows.length} услуг в каталоге</p>
        </div>
        <Link
          href="/admin/services/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Новая услуга
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
          Пока нет услуг.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="text-left font-medium px-6 py-3">Услуга</th>
                  <th className="text-left font-medium px-6 py-3">Категория</th>
                  <th className="text-right font-medium px-6 py-3">Цена</th>
                  <th className="text-right font-medium px-6 py-3">Обновлено</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.title}</div>
                          <div className="text-xs text-slate-500 font-mono truncate">
                            {s.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {s.category ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      {Number(s.price).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-6 py-3 text-right text-slate-500 whitespace-nowrap">
                      {s.updatedAt
                        ? new Date(s.updatedAt).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/admin/services/${s.id}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Редактировать"
                      >
                        <Pencil className="w-4 h-4" strokeWidth={2.25} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
