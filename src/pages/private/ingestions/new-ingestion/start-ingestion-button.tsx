import { ArrowRight, ClipboardList, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IngestionMode } from "./types";

export function StartIngestionButton({
  canStart,
  isSubmitting,
  completedCount,
  itemCount,
  mode,
  hint,
  onStart,
}: {
  canStart: boolean;
  isSubmitting: boolean;
  completedCount: number;
  itemCount: number;
  mode: IngestionMode;
  hint: string;
  onStart: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={!canStart}
      className={cn(
        "w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-200",
        canStart
          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.99]"
          : "bg-gray-100 text-gray-400 cursor-not-allowed",
      )}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Uploading {completedCount}/{itemCount}...
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
    </button>
  );
}
