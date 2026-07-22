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

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className={cn(
            "relative h-12 flex-1 overflow-hidden rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-200",
            canStart
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.99]"
              : isSubmitting
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
          )}
        >
          {isSubmitting && (
            <span
              className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-200"
              style={{ width: `${percent}%` }}
              aria-hidden
            />
          )}
          <span className="relative flex items-center gap-2.5">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading {completedCount}/{itemCount} · {percent}%
              </>
            ) : canStart ? (
              <>
                {mode === "guided" ? (
                  <ClipboardList className="size-4" />
                ) : (
                  <Zap className="size-4" />
                )}
                {`Start ${mode === "guided" ? "Guided" : "Auto"} Ingestion`}
                {itemCount > 1 ? ` · ${itemCount} files` : ""}
                <ArrowRight className="size-4" />
              </>
            ) : (
              <>
                <span className="size-4 flex-shrink-0 rounded-full border-2 border-gray-300" />
                {hint}
              </>
            )}
          </span>
        </button>

        {isSubmitting && (
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition-colors hover:border-red-300 hover:text-red-600"
          >
            <X className="mr-1.5 inline size-4" />
            Cancel
          </button>
        )}
      </div>

      {isSubmitting && (
        // Uploading takes seconds; the pipeline that follows takes minutes.
        // Saying so stops the quiet period afterwards from reading as a stall.
        <p className="text-center text-xs text-gray-400">
          Transferring files — ingestion continues on the server afterwards.
        </p>
      )}
    </div>
  );
}
