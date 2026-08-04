import { ArrowRight, ClipboardList, Loader2, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IngestionMode } from "./types";

export function StartIngestionButton({
  canStart,
  isSubmitting,
  completedCount,
  itemCount,
  mode,
  hint,
  uploadedRatio,
  onStart,
  onCancel,
}: {
  canStart: boolean;
  isSubmitting: boolean;
  completedCount: number;
  itemCount: number;
  mode: IngestionMode;
  hint: string;
  /** Bytes transferred across the batch, 0–1. */
  uploadedRatio: number;
  onStart: () => void;
  onCancel: () => void;
}) {
  const percent = Math.round(uploadedRatio * 100);
  const ModeIcon = mode === "guided" ? ClipboardList : Zap;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          aria-busy={isSubmitting}
          className={cn(
            // Sized to its label: a fixed-width button leaves a wide empty slab
            // when the label is short, which reads as a broken layout.
            "relative h-11 flex-1 overflow-hidden rounded-xl px-5 text-sm font-semibold sm:flex-none",
            "flex items-center justify-center gap-2 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
            canStart
              ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
              : isSubmitting
                ? "bg-indigo-600 text-white"
                : "cursor-not-allowed bg-gray-100 text-gray-400",
          )}
        >
          {isSubmitting && (
            <span
              className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-200"
              style={{ width: `${percent}%` }}
              aria-hidden
            />
          )}
          <span className="relative flex items-center gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading {completedCount}/{itemCount} · {percent}%
              </>
            ) : canStart ? (
              <>
                <ModeIcon className="size-4" />
                {`Start ${mode === "guided" ? "guided" : "auto"} ingestion`}
                {itemCount > 1 ? ` · ${itemCount} files` : ""}
                <ArrowRight className="size-4" />
              </>
            ) : (
              hint
            )}
          </span>
        </button>

        {isSubmitting && (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-4" />
            Cancel
          </button>
        )}
      </div>

      {/* Progress lives inside a button label, which screen readers do not
          re-announce as it changes. Mirror it in a live region instead. */}
      <p className="sr-only" role="status" aria-live="polite">
        {isSubmitting
          ? `Uploading ${completedCount} of ${itemCount} files, ${percent} percent transferred.`
          : ""}
      </p>

      {isSubmitting && (
        // Uploading takes seconds; the pipeline that follows takes minutes.
        // Saying so stops the quiet period afterwards from reading as a stall.
        <p className="text-center text-[11px] text-gray-400 lg:text-right">
          Transferring files — ingestion continues on the server afterwards.
        </p>
      )}
    </div>
  );
}
