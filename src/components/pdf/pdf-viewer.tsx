import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Minus, Plus } from "lucide-react";
import type { TPdfHighlight } from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pdfjs, type PdfDocument } from "./pdfjs";
import { PdfPage } from "./pdf-page";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export function PdfViewer({
  url,
  highlights = [],
  /** 1-based page to scroll to once loaded (and whenever it changes). */
  targetPage,
  className,
  onHighlightClick,
}: {
  url: string;
  highlights?: TPdfHighlight[];
  targetPage?: number | null;
  className?: string;
  onHighlightClick?: (ownerId: string) => void;
}) {
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState("");
  const [trackedUrl, setTrackedUrl] = useState(url);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset during render when the source changes, rather than in the effect —
  // keeps the reset in the same commit and out of the effect body.
  if (trackedUrl !== url) {
    setTrackedUrl(url);
    setDoc(null);
    setPageCount(0);
    setError("");
  }

  const isLoading = !doc && !error;

  useEffect(() => {
    let cancelled = false;
    const task = pdfjs.getDocument({ url, withCredentials: false });
    task.promise
      .then((loaded) => {
        // The effect cleanup calls task.destroy(), which tears down the
        // document too, so a cancelled load just bails.
        if (cancelled) return;
        setDoc(loaded);
        setPageCount(loaded.numPages);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          (loadError as { message?: string })?.message ||
            "Could not open this PDF.",
        );
      });

    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [url]);

  // Highlights are a flat list spanning pages; index them by page so each page
  // only paints its own.
  const highlightsByPage = useMemo(() => {
    const grouped = new Map<number, TPdfHighlight[]>();
    for (const region of highlights) {
      const list = grouped.get(region.page) ?? [];
      list.push(region);
      grouped.set(region.page, list);
    }
    return grouped;
  }, [highlights]);

  // The page the caller wants centered: an explicit target, else the first
  // highlighted page, so opening a citation lands on the evidence.
  const scrollTarget =
    targetPage ?? (highlights.length > 0 ? highlights[0].page : null);

  const scrollToPage = (pageNumber: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const pageEl = container.querySelector<HTMLElement>(
      `[data-page="${pageNumber}"]`,
    );
    pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (error) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-2 p-8 text-center",
          className,
        )}
      >
        <AlertCircle className="size-8 text-red-400" />
        <p className="text-sm font-medium text-gray-700">Couldn&apos;t load the PDF</p>
        <p className="max-w-sm text-xs text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">
          {pageCount > 0 ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : ""}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
            disabled={scale <= MIN_SCALE}
            title="Zoom out"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums text-gray-500">
            {Math.round(scale * 100)}%
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
            disabled={scale >= MAX_SCALE}
            title="Zoom in"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative flex-1 overflow-auto bg-gray-100"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        )}
        {doc && (
          <div className="flex flex-col items-center gap-4 py-4">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
              <PdfPage
                key={page}
                doc={doc}
                pageNumber={page}
                scale={scale}
                highlights={highlightsByPage.get(page) ?? []}
                onHighlightClick={onHighlightClick}
                onRendered={(rendered) => {
                  // Scroll once the target page has actually painted, so the
                  // offset is correct rather than measured against a zero-height
                  // placeholder.
                  if (scrollTarget && rendered === scrollTarget) {
                    scrollToPage(rendered);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
