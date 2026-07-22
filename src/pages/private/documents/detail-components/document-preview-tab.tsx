import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Eye, FileText, Loader2, MapPin } from "lucide-react";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TIngestionChunk,
  type TIngestionDocument,
  getChunkRegions,
} from "@/core/ingestions";
import type { TPdfRegion } from "@/core/retrieval";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { cn } from "@/lib/utils";

/** File types the in-app viewer can render. */
function isPreviewable(fileType: string | undefined): boolean {
  return (fileType ?? "").toLowerCase() === "pdf";
}

export function DocumentPreviewTab({
  document,
  chunks,
}: {
  document: TIngestionDocument;
  chunks: TIngestionChunk[];
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [settled, setSettled] = useState(false);
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);

  const previewable = isPreviewable(document.fileType);
  // Loading until the fetch settles, but never for a non-previewable file.
  const isLoading = previewable && !settled;

  // Chunks that actually carry geometry — only these can be jumped to.
  const locatable = useMemo(
    () =>
      chunks
        .map((chunk) => ({ chunk, regions: getChunkRegions(chunk) }))
        .filter((entry) => entry.regions.length > 0),
    [chunks],
  );

  useEffect(() => {
    if (!previewable) return;
    let cancelled = false;

    backendApi
      .get<{ url: string; filename: string }>(
        `/documents/${document.id}/source-url?disposition=inline`,
      )
      .then((response) => {
        if (!cancelled) setUrl(response.url);
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(
            getApiErrorMessage(fetchError, "Could not load the source file."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [document.id, previewable]);

  const activeEntry = locatable.find((entry) => entry.chunk.id === activeChunkId);
  const highlights: TPdfRegion[] = activeEntry?.regions ?? [];
  const targetPage = highlights[0]?.page ?? null;

  if (!previewable) {
    return (
      <EmptyPreview
        icon={FileText}
        title="No inline preview for this file type"
        detail={`This is a ${document.fileType?.toUpperCase() || "non-PDF"} file. Use Download to open it.`}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-gray-200/80 bg-white">
        <Loader2 className="size-6 animate-spin text-indigo-500" />
        <p className="mt-3 text-xs font-medium text-gray-500">Preparing source preview…</p>
      </div>
    );
  }

  if (error || !url) {
    return (
      <EmptyPreview
        icon={AlertCircle}
        title="Source file unavailable"
        detail={error || "This document has no stored source file to preview."}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-950">Source preview</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Compare extracted chunks with their exact location in the original PDF.
          </p>
        </div>
        {locatable.length > 0 && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            {locatable.length.toLocaleString()} locatable chunks
          </span>
        )}
      </div>

      <div
        className={cn(
          "grid min-h-[680px] bg-[#eef0f5]",
          locatable.length > 0 && "lg:grid-cols-[280px_minmax(0,1fr)]",
        )}
      >
        {locatable.length > 0 && (
          <aside className="order-2 border-t border-gray-200 bg-white lg:order-1 lg:border-r lg:border-t-0">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-xs font-bold text-gray-700">
              <MapPin className="size-3.5 text-indigo-500" />
              Jump to a chunk
            </div>
            <div className="max-h-[680px] space-y-1 overflow-y-auto p-2">
              {locatable.map(({ chunk }) => {
                const isActive = chunk.id === activeChunkId;
                const label =
                  chunk.summaryContent?.trim() ||
                  chunk.textContent.trim() ||
                  `Chunk ${chunk.chunkIndex + 1}`;
                return (
                  <button
                    key={chunk.id}
                    type="button"
                    onClick={() =>
                      setActiveChunkId(isActive ? null : chunk.id)
                    }
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left text-xs transition-all",
                      isActive
                        ? "bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        Chunk {chunk.chunkIndex + 1}
                      </span>
                      {chunk.pageNumber != null && (
                        <span className="flex-shrink-0 text-[10px] text-gray-400">
                          p. {chunk.pageNumber}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[11px] text-gray-400">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        <div className="order-1 min-h-[680px] min-w-0 overflow-hidden lg:order-2">
          <PdfViewer url={url} highlights={highlights} targetPage={targetPage} />
        </div>
      </div>
    </section>
  );
}

function EmptyPreview({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof FileText;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-50">
        <Icon className="size-6 text-gray-300" />
      </div>
      <p className="mt-3 text-sm font-bold text-gray-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-gray-400">{detail}</p>
    </div>
  );
}
