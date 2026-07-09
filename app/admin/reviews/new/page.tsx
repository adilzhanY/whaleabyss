import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReviewForm from "../ReviewForm";

export const dynamic = "force-dynamic";

export default function NewReviewPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/reviews"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
        Отзывы
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Новый фейк отзыв</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Отзыв добавляется сразу как одобренный и появляется на странице отзывов.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
        <ReviewForm />
      </div>
    </div>
  );
}
