import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReviewForm from "../ReviewForm";
import PageHeader from "../../_components/PageHeader";

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

      <PageHeader subtitle="Отзыв добавляется сразу как одобренный и появляется на странице отзывов." />

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
        <ReviewForm />
      </div>
    </div>
  );
}
