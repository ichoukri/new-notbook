import {
  AlertCircle,
  Calendar,
  Database,
  Download,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { ModeBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/core/datasets";
import {
  getDocumentMode,
  getDocumentStatusValue,
  getDocumentUploadedAtLabel,
} from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";
import { CopyButton } from "./copy-control";

export function DocumentHeader({
  document,
  datasetName,
  pageCount,
  chunkCount,
  uploaderLabel,
  isDownloading,
  isRetrying,
  onDownload,
  onRetry,
  onDelete,
}: {
  document: TIngestionDocument;
  datasetName: string;
  pageCount: number | null;
  chunkCount: number;
  uploaderLabel: string;
  isDownloading: boolean;
  isRetrying: boolean;
  onDownload: () => void;
  onRetry: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <FileText className="size-6 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 group">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {document.filename}
              </h1>
              <CopyButton value={document.id} label="Document ID copied" />
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500">
              <StatusBadge status={getDocumentStatusValue(document.processingStatus)} />
              <ModeBadge mode={getDocumentMode(document)} />
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5" />
                {document.fileType.toUpperCase()} · {formatFileSize(document.fileSize)}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5" />
                {pageCount?.toLocaleString() ?? "—"} pages ·{" "}
                {chunkCount.toLocaleString()} chunks
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {getDocumentUploadedAtLabel(document)}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" />
                {uploaderLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="size-3.5" />
                {datasetName}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={onDownload}
            disabled={isDownloading || !document.sourceUrl}
            title={document.sourceUrl ? "Download source file" : "No source file"}
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Re-run Ingestion
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DocumentFailureAlert({
  message,
  stage,
  traceback,
}: {
  message: string | null;
  stage: string | null;
  traceback: string | null;
}) {
  const [showTraceback, setShowTraceback] = useState(false);

  if (!message) {
    return null;
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-700">
            Ingestion failed
            {stage && (
              <span className="ml-2 text-xs font-normal text-red-600/80">
                at {stage} stage
              </span>
            )}
          </p>
          <p className="text-xs text-red-600/90 mt-0.5 wrap-break-word whitespace-pre-wrap">
            {message}
          </p>
          {traceback && (
            <>
              <button
                type="button"
                onClick={() => setShowTraceback((value) => !value)}
                className="text-xs text-red-700 hover:text-red-900 underline mt-2"
              >
                {showTraceback ? "Hide" : "Show"} technical details
              </button>
              {showTraceback && (
                <pre className="mt-2 text-[11px] text-gray-800 bg-white border border-red-200 rounded-lg px-3 py-2 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre font-mono">
                  {traceback}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
