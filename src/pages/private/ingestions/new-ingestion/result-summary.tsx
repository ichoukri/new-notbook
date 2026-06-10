import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResultSummary({
  startedCount,
  duplicateCount,
  failedCount,
  onRetryFailed,
}: {
  startedCount: number;
  duplicateCount: number;
  failedCount: number;
  onRetryFailed: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 text-sm",
        failedCount > 0
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50",
      )}
    >
      <span className="font-semibold text-gray-700">Result</span>
      {startedCount > 0 && (
        <span className="flex items-center gap-1.5 text-emerald-700">
          <CheckCircle2 className="size-4" />
          {startedCount} started
        </span>
      )}
      {duplicateCount > 0 && (
        <span className="text-amber-700">
          {duplicateCount} duplicate{duplicateCount === 1 ? "" : "s"}
        </span>
      )}
      {failedCount > 0 && (
        <span className="flex items-center gap-1.5 text-red-600">
          <AlertCircle className="size-4" />
          {failedCount} failed
        </span>
      )}
      {failedCount > 0 && (
        <button
          type="button"
          onClick={onRetryFailed}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
        >
          <RefreshCw className="size-3.5" />
          Retry {failedCount} failed
        </button>
      )}
    </div>
  );
}
