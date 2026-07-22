import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Database,
  Download,
  FileText,
  Layers3,
  Loader2,
  RefreshCw,
  Trash2,
  UserRound,
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
  onOpenDataset,
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
  onOpenDataset: () => void;
}) {
  const hasDataset = document.datasetIds.length > 0;

  return (
    <section className="relative isolate overflow-hidden rounded-[26px] bg-[#121827] text-white shadow-[0_18px_55px_-28px_rgba(44,40,120,0.6)] ring-1 ring-black/5">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_13%_5%,rgba(129,140,248,0.34),transparent_32%),radial-gradient(circle_at_88%_95%,rgba(168,85,247,0.22),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="px-5 pb-5 pt-6 sm:px-7 sm:pb-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur sm:size-16">
              <FileText className="size-7 text-indigo-200 sm:size-8" strokeWidth={1.7} />
              <span className="absolute -bottom-2 rounded-md border border-white/10 bg-indigo-500 px-1.5 py-0.5 text-[9px] font-black tracking-wider text-white shadow-lg">
                {document.fileType.slice(0, 4).toUpperCase() || "FILE"}
              </span>
            </div>

            <div className="min-w-0 pt-0.5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={getDocumentStatusValue(document.processingStatus)} />
                <ModeBadge mode={getDocumentMode(document)} />
                <span className="text-xs font-medium text-slate-400">
                  {formatFileSize(document.fileSize)}
                </span>
              </div>
              <div className="group flex min-w-0 items-center gap-2">
                <h1 className="max-w-4xl truncate text-xl font-bold tracking-[-0.025em] text-white sm:text-2xl lg:text-[28px]">
                  {document.filename}
                </h1>
                <CopyButton value={document.id} label="Document ID copied" />
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Inspect the source, extracted content, retrieval quality, and every
                ingestion artifact from one workspace.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-[84px] xl:pl-0">
            <Button
              size="sm"
              onClick={onDownload}
              disabled={isDownloading || !document.sourceUrl}
              title={document.sourceUrl ? "Download source file" : "No source file"}
              className="h-9 gap-2 border-0 bg-white px-4 font-semibold text-slate-900 shadow-lg shadow-black/15 hover:bg-slate-100"
            >
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download source
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              disabled={isRetrying}
              className="h-9 gap-2 border-white/15 bg-white/[0.07] px-4 text-white hover:bg-white/[0.14] hover:text-white"
            >
              {isRetrying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Re-run
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onDelete}
              className="h-9 w-9 border-white/15 bg-white/[0.07] text-slate-300 hover:border-red-300/40 hover:bg-red-400/15 hover:text-red-200"
              aria-label="Delete document"
              title="Delete document"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-7 grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] backdrop-blur sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
          <HeaderFact
            icon={Database}
            label="Dataset"
            value={datasetName}
            action={hasDataset ? onOpenDataset : undefined}
          />
          <HeaderFact
            icon={Layers3}
            label="Document structure"
            value={`${pageCount?.toLocaleString() ?? "—"} pages · ${chunkCount.toLocaleString()} chunks`}
          />
          <HeaderFact
            icon={CalendarDays}
            label="Uploaded"
            value={getDocumentUploadedAtLabel(document)}
          />
          <HeaderFact icon={UserRound} label="Owner" value={uploaderLabel} />
        </div>
      </div>
    </section>
  );
}

function HeaderFact({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  action?: () => void;
}) {
  const content = (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-indigo-200">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-[13px] font-semibold text-slate-100">
          {value}
        </p>
      </div>
      {action && <ChevronRight className="size-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />}
    </>
  );

  return action ? (
    <button
      type="button"
      onClick={action}
      className="group flex min-w-0 items-center gap-3 border-b border-white/10 p-4 transition-colors hover:bg-white/[0.06] sm:[&:nth-child(odd)]:border-r lg:border-b-0"
    >
      {content}
    </button>
  ) : (
    <div className="flex min-w-0 items-center gap-3 border-b border-white/10 p-4 sm:[&:nth-child(odd)]:border-r lg:border-b-0">
      {content}
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

  if (!message) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-l-4 border-red-500 px-4 py-4 sm:px-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
          <AlertCircle className="size-4 text-red-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-red-800">Ingestion needs attention</p>
            {stage && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                {stage} stage
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-red-700/80">
            {message}
          </p>
          {traceback && (
            <>
              <button
                type="button"
                onClick={() => setShowTraceback((value) => !value)}
                className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900"
              >
                {showTraceback ? "Hide" : "Show"} technical details
              </button>
              {showTraceback && (
                <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-red-100 bg-slate-950 px-4 py-3 font-mono text-[11px] leading-5 text-slate-200">
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
