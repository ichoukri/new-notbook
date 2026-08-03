import { AlertCircle, CheckCircle2, Copy, FolderX, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { collectFailedFolders } from "./failed-folders";
import type { UploadItem } from "./types";

/** Folders whose failures are worth calling out individually. */
const MAX_LISTED_FOLDERS = 3;

export function ResultSummary({
  items,
  startedCount,
  duplicateCount,
  failedCount,
  cancelledCount,
  onRetryFailed,
}: {
  items: UploadItem[];
  startedCount: number;
  duplicateCount: number;
  failedCount: number;
  cancelledCount: number;
  onRetryFailed: () => void;
}) {
  const nothingStarted =
    startedCount === 0 && failedCount === 0 && cancelledCount === 0;
  // Cancelled uploads are resumable, not lost.
  const resumableCount = failedCount + cancelledCount;
  const failedFolders = collectFailedFolders(items);

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        failedCount > 0 || nothingStarted
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-semibold text-gray-700">Result</span>
        {startedCount > 0 && (
          <span className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="size-4" />
            {startedCount} started
          </span>
        )}
        {duplicateCount > 0 && (
          <span className="flex items-center gap-1.5 text-amber-700">
            <Copy className="size-4" />
            {duplicateCount} already in dataset
          </span>
        )}
        {failedCount > 0 && (
          <span className="flex items-center gap-1.5 text-red-600">
            <AlertCircle className="size-4" />
            {failedCount} failed
          </span>
        )}
        {cancelledCount > 0 && (
          <span className="flex items-center gap-1.5 text-gray-500">
            <XCircle className="size-4" />
            {cancelledCount} cancelled
          </span>
        )}
        {resumableCount > 0 && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            <RefreshCw className="size-3.5" />
            {failedCount > 0 && cancelledCount > 0
              ? `Upload ${resumableCount} remaining`
              : cancelledCount > 0
                ? `Resume ${cancelledCount} cancelled`
                : `Retry ${failedCount} failed`}
          </button>
        )}
      </div>

      {failedFolders.length > 0 && (
        // "12 failed" spread across a folder tree is 12 unrelated problems;
        // "11 of 12 were in 4-BOM/" is one bad folder. Say which.
        <div className="mt-2 border-t border-black/5 pt-2">
          <p className="text-xs font-medium text-gray-600">Failures by folder</p>
          <ul className="mt-1 space-y-0.5">
            {failedFolders.slice(0, MAX_LISTED_FOLDERS).map((folder) => (
              <li
                key={folder.path}
                className="flex items-center gap-1.5 text-xs text-gray-500"
              >
                <FolderX className="size-3.5 shrink-0 text-red-400" />
                <span className="truncate font-medium text-gray-700">
                  {folder.path}
                </span>
                <span className="shrink-0 text-gray-400">
                  {folder.failed} of {folder.total} failed
                </span>
              </li>
            ))}
            {failedFolders.length > MAX_LISTED_FOLDERS && (
              <li className="text-xs text-gray-400">
                and {failedFolders.length - MAX_LISTED_FOLDERS} more folder
                {failedFolders.length - MAX_LISTED_FOLDERS === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        </div>
      )}

      {nothingStarted && duplicateCount > 0 && (
        <p className="mt-1.5 text-xs leading-relaxed text-amber-800">
          No new ingestions were started — these files already exist in this
          dataset. Use <span className="font-semibold">View stages</span> on a
          file to review the existing document&apos;s pipeline.
        </p>
      )}
    </div>
  );
}
