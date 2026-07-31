"use client";

import { useRef, useState } from "react";
import { Eye, Download, Trash2, Upload, FileText, IdCard, Loader2 } from "lucide-react";
import DocumentViewer from "@/components/DocumentViewer";
import { confirmDialog } from "@/store/useConfirm";

/**
 * «Документы» card on /admin/booster/[id]: agreement (PDF) + passport scan
 * (JPG/PNG). Files live in the private S3 bucket and are streamed through the
 * admin-guarded API — the URLs below only work with an admin session cookie.
 * Viewing uses the shared DocumentViewer (iframe for PDFs, zoom/pan for images).
 */

export interface BoosterDocument {
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
  accept: string;
  icon: React.ElementType;
}[] = [
  {
    docType: "agreement",
    title: "Договор",
    hint: "PDF, до 20 МБ",
    accept: "application/pdf",
    icon: FileText,
  },
  {
    docType: "passport",
    title: "Паспорт",
    hint: "JPG или PNG, до 10 МБ",
    accept: "image/jpeg,image/png",
    icon: IdCard,
  },
];

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} МБ`
    : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" });

export default function DocumentsCard({
  boosterId,
  initialDocuments,
  bare = false,
}: {
  boosterId: string;
  initialDocuments: BoosterDocument[];
  /**
   * Compact mode: no card shell, no title, and each slot is ONE row instead of
   * a tall tile. Documents exist for 2 boosters out of 7 — at full size this
   * block spent half a screen saying «PDF, до 20 МБ» to everyone else.
   */
  bare?: boolean;
}) {
  const [docs, setDocs] = useState<BoosterDocument[]>(initialDocuments);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<BoosterDocument | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const docUrl = (doc: BoosterDocument, download = false) =>
    `/api/admin/boosters/${boosterId}/documents/${doc.id}${download ? "?download=1" : ""}`;

  const handleUpload = async (docType: "agreement" | "passport", file: File) => {
    setBusyType(docType);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);
      const res = await fetch(`/api/admin/boosters/${boosterId}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось загрузить файл");
        return;
      }
      setDocs((prev) => [...prev.filter((d) => d.docType !== docType), data.document]);
    } catch {
      setError("Не удалось загрузить файл");
    } finally {
      setBusyType(null);
    }
  };

  const handleDelete = async (doc: BoosterDocument) => {
    const ok = await confirmDialog({
      title: `Удалить документ «${doc.fileName}»?`,
      description: "Это действие необратимо.",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    setBusyType(doc.docType);
    setError(null);
    try {
      const res = await fetch(docUrl(doc), { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Не удалось удалить документ");
        return;
      }
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      setError("Не удалось удалить документ");
    } finally {
      setBusyType(null);
    }
  };

  const body = (
    <>
      {!bare && (
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Документы</h2>
      )}

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={bare ? "flex flex-col gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
        {SLOTS.map((slot) => {
          const doc = docs.find((d) => d.docType === slot.docType);
          const busy = busyType === slot.docType;
          return (
            <div
              key={slot.docType}
              className={
                bare
                  ? "rounded-xl border border-slate-200 px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2"
                  : "rounded-xl border border-slate-200 p-4 flex flex-col gap-3"
              }
            >
              <div className="flex items-center gap-2.5">
                <slot.icon className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-700">{slot.title}</div>
                  {/* The size hint only matters while there is nothing to show. */}
                  {(!bare || !doc) && <div className="text-xs text-slate-400">{slot.hint}</div>}
                </div>
              </div>

              {doc ? (
                <>
                  <div className={bare ? "min-w-0 flex-1" : "min-w-0"}>
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
                    <button
                      type="button"
                      onClick={() => fileInputs.current[slot.docType]?.click()}
                      disabled={busy}
                      title="Заменить файл"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      disabled={busy}
                      title="Удалить"
                      className="ml-auto inline-flex items-center p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputs.current[slot.docType]?.click()}
                  disabled={busy}
                  className={
                    bare
                      ? "ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                      : "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  }
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Загрузить
                </button>
              )}

              <input
                ref={(el) => { fileInputs.current[slot.docType] = el; }}
                type="file"
                accept={slot.accept}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(slot.docType, file);
                  e.target.value = ""; // allow re-selecting the same file
                }}
              />
            </div>
          );
        })}
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
    </>
  );

  if (bare) return body;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">{body}</div>
  );
}
