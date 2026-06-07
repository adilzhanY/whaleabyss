"use client";

import { useEffect, useState } from "react";
import { Eye, Download, FileText, IdCard, Loader2 } from "lucide-react";
import DocumentViewer from "@/components/DocumentViewer";

/**
 * /portal/documents — the booster's own agreement + passport scan, presented
 * with the same two-slot layout as /admin/booster/[id], but read-only
 * (view/download — uploads stay admin-side). Files stream through the
 * booster-scoped private-bucket route.
 */

interface PortalDocument {
  id: string;
  docType: "agreement" | "passport";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: string;
}

const SLOTS: {
  docType: "agreement" | "passport";
  title: string;
  hint: string;
  icon: React.ElementType;
}[] = [
  { docType: "agreement", title: "Договор", hint: "PDF", icon: FileText },
  { docType: "passport", title: "Паспорт", hint: "JPG или PNG", icon: IdCard },
];

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} МБ`
    : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" });

export default function PortalDocumentsPage() {
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<PortalDocument | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/me");
        if (res.ok) {
          const data = await res.json();
          setDocs(data.documents ?? []);
        }
      } catch (err) {
        console.error("Failed to load documents:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const docUrl = (doc: PortalDocument, download = false) =>
    `/api/portal/documents/${doc.id}${download ? "?download=1" : ""}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1
          className="text-3xl font-black text-blue-950"
          style={{ fontFamily: "var(--font-primary), sans-serif" }}
        >
          Документы
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ваш договор и паспорт. Загрузкой и заменой занимается администратор.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SLOTS.map((slot) => {
            const doc = docs.find((d) => d.docType === slot.docType);
            return (
              <div
                key={slot.docType}
                className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <slot.icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-700">{slot.title}</div>
                    <div className="text-xs text-slate-400">{slot.hint}</div>
                  </div>
                </div>

                {doc ? (
                  <>
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 truncate" title={doc.fileName}>
                        {doc.fileName}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {fmtSize(doc.sizeBytes)} · {fmtDate(doc.updatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(doc)}
                        title="Просмотреть"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Открыть
                      </button>
                      <a
                        href={docUrl(doc, true)}
                        title="Скачать"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Скачать
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 py-3 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    Ещё не загружен
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {viewing && (
        <DocumentViewer
          fileName={viewing.fileName}
          mimeType={viewing.mimeType}
          url={docUrl(viewing)}
          downloadUrl={docUrl(viewing, true)}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
