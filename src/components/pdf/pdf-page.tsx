import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PdfDocument } from "./pdfjs";
import type { TPdfHighlight } from "./types";

/**
 * Renders one PDF page to a canvas and overlays highlight boxes.
 *
 * Highlights are top-left-origin page fractions, so they map to CSS percentages
 * directly and stay correct at any zoom — the same normalized geometry the
 * ingestion pipeline captured.
 */
export function PdfPage({
  doc,
  pageNumber,
  scale,
  highlights,
  onRendered,
  onHighlightClick,
}: {
  doc: PdfDocument;
  pageNumber: number;
  scale: number;
  highlights: TPdfHighlight[];
  onRendered?: (pageNumber: number) => void;
  onHighlightClick?: (ownerId: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    // pdf.js rejects overlapping renders on the same canvas; keep a handle so a
    // scale change mid-render can cancel the previous one.
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    const render = async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      renderTask = page.render({ canvas, canvasContext: context, viewport });
      try {
        await renderTask.promise;
      } catch (error) {
        // A cancelled render throws RenderingCancelledException — expected when
        // the scale changes; anything else is a real failure.
        if ((error as { name?: string })?.name !== "RenderingCancelledException") {
          throw error;
        }
        return;
      }
      if (cancelled) return;
      setSize({ width: viewport.width, height: viewport.height });
      onRendered?.(pageNumber);
    };

    void render();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
    // onRendered is intentionally excluded — it changes identity per render and
    // is a fire-and-forget notification, not a render input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, pageNumber, scale]);

  return (
    <div className="relative shadow-sm" data-page={pageNumber}>
      <canvas ref={canvasRef} className="block" />
      {size &&
        highlights.map((region, index) => {
          const clickable = Boolean(region.ownerId && onHighlightClick);
          return (
            <div
              key={`${region.page}-${index}`}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={
                clickable
                  ? () => onHighlightClick?.(region.ownerId as string)
                  : undefined
              }
              onKeyDown={
                clickable
                  ? (event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onHighlightClick?.(region.ownerId as string);
                    }
                  : undefined
              }
              title={
                region.stale
                  ? "Approximate — this chunk's text was edited after the source was mapped"
                  : undefined
              }
              className={cn(
                "absolute rounded-sm animate-in fade-in duration-300",
                clickable ? "cursor-pointer" : "pointer-events-none",
                // Muted marks every chunk's footprint so the document's whole
                // segmentation is legible; primary is the one in focus.
                region.tone === "muted"
                  ? "bg-violet-300/12 ring-1 ring-violet-400/30 hover:bg-violet-300/25"
                  : region.stale
                    ? "border border-dashed border-amber-500/60 bg-amber-200/20"
                    : "bg-amber-300/35 ring-1 ring-amber-500/70",
              )}
              style={{
                left: `${region.l * 100}%`,
                top: `${region.t * 100}%`,
                width: `${(region.r - region.l) * 100}%`,
                height: `${(region.b - region.t) * 100}%`,
              }}
            />
          );
        })}
    </div>
  );
}
