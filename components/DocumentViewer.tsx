"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Download, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

/**
 * Full-screen viewer for private booster documents: native iframe for PDFs
 * (browser viewer = scroll/zoom/search for free, zero extra JS attack
 * surface), zoom/pan canvas for images via react-zoom-pan-pinch.
 *
 * Shared between the admin booster page and the booster portal — the caller
 * supplies the (auth-scoped) stream URLs.
 */
export default function DocumentViewer({
  fileName,
  mimeType,
  url,
  downloadUrl,
  onClose,
}: {
  fileName: string;
  mimeType: string;
  url: string;
  downloadUrl: string;
  onClose: () => void;
}) {
  const isPdf = mimeType === "application/pdf";

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onKeyDown]);

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex flex-col" onClick={onClose}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-slate-900/60 text-white shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium truncate">{fileName}</span>
        <a
          href={downloadUrl}
          title="Скачать"
          className="ml-auto inline-flex items-center p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          type="button"
          onClick={onClose}
          title="Закрыть (Esc)"
          className="inline-flex items-center p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 p-4 pt-0" onClick={(e) => e.stopPropagation()}>
        {isPdf ? (
          <iframe
            src={url}
            title={fileName}
            className="w-full h-full rounded-xl bg-white border-0"
          />
        ) : (
          <TransformWrapper minScale={0.5} maxScale={8} doubleClick={{ mode: "zoomIn" }} centerOnInit>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <div className="relative w-full h-full">
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%" }}
                >
                  {/* Private, cookie-authed stream — next/image optimizer must not proxy it. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={fileName}
                    className="w-full h-full object-contain select-none"
                    draggable={false}
                  />
                </TransformComponent>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/70 rounded-full p-1">
                  <button type="button" onClick={() => zoomOut()} title="Уменьшить" className="p-2 rounded-full text-white hover:bg-white/10 transition-colors cursor-pointer">
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => resetTransform()} title="Сбросить" className="p-2 rounded-full text-white hover:bg-white/10 transition-colors cursor-pointer">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => zoomIn()} title="Увеличить" className="p-2 rounded-full text-white hover:bg-white/10 transition-colors cursor-pointer">
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </TransformWrapper>
        )}
      </div>
    </div>,
    document.body
  );
}
