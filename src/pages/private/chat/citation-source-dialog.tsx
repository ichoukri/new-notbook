import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import type { TGroundedCitation } from "@/core/retrieval";
import { PdfViewer } from "@/components/pdf/pdf-viewer";

/**
 * Opens the cited PDF at the evidence, highlighted, without leaving the chat.
 *
 * Only PDFs render inline; anything else falls back to the detail page (the
 * caller decides), so this assumes a previewable source and shows a clear error
 * if the file cannot be fetched.
 */
export function CitationSourceDialog({
  citation,
  onOpenChange,
}: {
  citation: TGroundedCitation | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [settled, setSettled] = useState(false);

  const documentId = citation?.documentId;
  const [trackedId, setTrackedId] = useState(documentId);

  // Reset during render when the citation changes, not in the effect.
  if (trackedId !== documentId) {
    setTrackedId(documentId);
    setUrl(null);
    setError("");
    setSettled(false);
  }

  const isLoading = Boolean(documentId) && !settled;

  useEffect(() => {
    if (!documentId) return;
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
          setError(getApiErrorMessage(fetchError, "Could not load this source."));
        }
      })
      .finally(() => {
        if (!cancelled) setSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const targetPage = citation?.regions[0]?.page ?? citation?.pageNumber ?? null;

  return (
    <Dialog open={citation !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] flex-col p-0 sm:max-w-6xl">
        <DialogHeader className="border-b border-gray-100 px-4 py-3">
          <DialogTitle className="truncate text-sm">
            {citation?.documentFilename ?? "Source"}
            {citation?.regions.length ? (
              <span className="ml-2 font-normal text-gray-400">
                highlighted evidence
              </span>
            ) : targetPage != null ? (
              <span className="ml-2 font-normal text-gray-400">
                page {targetPage}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {isLoading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-gray-500">
              {error}
            </div>
          )}
          {url && (
            <PdfViewer
              url={url}
              highlights={citation?.regions ?? []}
              targetPage={targetPage}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
