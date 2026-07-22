import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import type { TPdfHighlight } from "@/components/pdf/types";
import type { PreviewChunk } from "./chunk-preview";

/**
 * The source PDF beside the chunk list, with every chunk's footprint drawn.
 *
 * Chunk review is about segmentation quality — whether a cut lands in the right
 * place. That is a spatial question: a boundary slicing a table in half, or a
 * chunk swallowing the next section's heading, is obvious on the page and close
 * to invisible in a list of text. Drawing every chunk muted shows the whole
 * document's carving at once; the focused chunk is emphasised on top.
 *
 * Rows come from the same preview the list renders, so staged edits are
 * reflected here instead of the pane silently showing pre-edit server state.
 */
export function ChunkSourcePane({
  documentId,
  rows,
  focusedKey,
  onFocusRow,
}: {
  documentId: string;
  rows: PreviewChunk[];
  focusedKey: string | null;
  onFocusRow: (key: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    backendApi
      .get<{ url: string; filename: string }>(
        `/documents/${documentId}/source-url?disposition=inline`,
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
  }, [documentId]);

  // Deleted rows are excluded: their boxes describe content that is on its way
  // out, and leaving them drawn would overstate what the document still covers.
  const visibleRows = useMemo(
    () => rows.filter((row) => row.status !== "deleted"),
    [rows],
  );

  const highlights = useMemo<TPdfHighlight[]>(() => {
    const all: TPdfHighlight[] = [];
    for (const row of visibleRows) {
      const isFocused = row.key === focusedKey;
      for (const region of row.regions) {
        all.push({
          ...region,
          ownerId: row.key,
          tone: isFocused ? "primary" : "muted",
          // A staged row's geometry is the parent's, not the applied result.
          stale: region.stale || row.regionsArePending,
        });
      }
    }
    // Draw the focused chunk last so its box sits above the muted ones.
    return all.sort((a, b) =>
      a.tone === b.tone ? 0 : a.tone === "muted" ? -1 : 1,
    );
  }, [visibleRows, focusedKey]);

  const targetPage = useMemo(() => {
    if (!focusedKey) return null;
    const focused = visibleRows.find((row) => row.key === focusedKey);
    if (!focused) return null;
    return focused.regions[0]?.page ?? focused.pageNumber ?? null;
  }, [visibleRows, focusedKey]);

  const mappedCount = useMemo(
    () => visibleRows.filter((row) => row.regions.length > 0).length,
    [visibleRows],
  );
  const hasPendingGeometry = visibleRows.some(
    (row) => row.regionsArePending && row.regions.length > 0,
  );

  if (!settled) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertCircle className="size-6 text-gray-300" />
        <p className="text-xs text-gray-500">
          {error || "No source file to preview."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {mappedCount === 0 ? (
        // Say so plainly rather than showing an unmarked PDF that looks broken.
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          These chunks have no source coordinates, so nothing can be
          highlighted. Documents ingested before position tracking need
          re-ingestion.
        </p>
      ) : hasPendingGeometry ? (
        <p className="border-b border-violet-100 bg-violet-50 px-3 py-2 text-[11px] text-violet-800">
          Dashed areas show the original chunk&apos;s position. Exact positions
          are recalculated when you apply your changes.
        </p>
      ) : null}
      <div className="min-h-0 flex-1">
        <PdfViewer
          url={url}
          highlights={highlights}
          targetPage={targetPage}
          onHighlightClick={onFocusRow}
        />
      </div>
    </div>
  );
}
