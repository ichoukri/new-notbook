import {
  ArrowUpRight,
  Blocks,
  Bot,
  CheckCircle2,
  Clock3,
  FileScan,
  FileText,
  HardDrive,
  Layers3,
  Network,
  ScanText,
  Sparkles,
} from "lucide-react";
import { ContentTypeBadge } from "@/components/app/status-badge";
import { formatFileSize } from "@/core/datasets";
import { getDocumentMode } from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";

type DocumentMetrics = {
  elementsDetected: number | null;
  totalChunks: number | null;
  processedChunks: number | null;
  storedChunks: number | null;
  vectorizedChunks: number | null;
  graphEntities: number | null;
  graphRelations: number | null;
  chunkVersion: number | null;
  embeddingModel: string | null;
  summaryModel: string | null;
  vectorStore: string | null;
};

const COMPOSITION_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
];

export function DocumentOverviewTab({
  document,
  pageCount,
  chunkCount,
  contentTypeCounts,
  previewText,
  metrics,
  isLoadingChunks,
  onOpenPreview,
  onOpenChunks,
}: {
  document: TIngestionDocument;
  pageCount: number | null;
  chunkCount: number;
  contentTypeCounts: Array<{ type: string; count: number }>;
  previewText: string | null;
  metrics: DocumentMetrics | null;
  isLoadingChunks: boolean;
  onOpenPreview: () => void;
  onOpenChunks: () => void;
}) {
  const isComplete = document.processingStatus === "completed";
  const isFailed = document.processingStatus === "failed";
  const vectorizedChunks = metrics?.vectorizedChunks ?? null;
  const vectorProgress = isComplete
    ? 100
    : chunkCount > 0 && vectorizedChunks !== null
      ? Math.min(100, Math.round((vectorizedChunks / chunkCount) * 100))
      : 0;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.72fr)]">
      <div className="min-w-0 space-y-5">
        <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 lg:grid-cols-4 lg:divide-y-0">
            <Stat icon={FileText} label="Pages" value={pageCount?.toLocaleString() ?? "—"} tone="indigo" />
            <Stat icon={Layers3} label="Chunks" value={chunkCount.toLocaleString()} tone="violet" />
            <Stat icon={HardDrive} label="File size" value={formatFileSize(document.fileSize)} tone="sky" />
            <Stat
              icon={Clock3}
              label="Ingestion mode"
              value={getDocumentMode(document) === "auto" ? "Automatic" : "Guided"}
              tone="amber"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <ScanText className="size-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-gray-950">Extracted content</h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                A quick read of the first available content block.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPreview}
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-800"
            >
              Open source
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
          <div className="relative min-h-52 px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute inset-x-6 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
            {isLoadingChunks ? (
              <div className="space-y-3 pt-2" aria-label="Loading extracted content">
                <div className="h-3 w-11/12 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-10/12 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-8/12 animate-pulse rounded bg-gray-100" />
              </div>
            ) : previewText ? (
              <p className="max-h-56 overflow-hidden whitespace-pre-wrap text-[13px] leading-6 text-gray-600">
                {previewText}
              </p>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <FileScan className="size-7 text-gray-300" />
                <p className="mt-2 text-sm font-semibold text-gray-700">No extracted text yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  Content appears here once the document has been chunked.
                </p>
              </div>
            )}
          </div>
        </section>

        <ContentComposition counts={contentTypeCounts} onOpenChunks={onOpenChunks} />
      </div>

      <aside className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-950">Retrieval readiness</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Pipeline output available to search and generation.
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  isComplete
                    ? "bg-emerald-50 text-emerald-600"
                    : isFailed
                      ? "bg-red-50 text-red-600"
                      : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {isComplete ? <CheckCircle2 className="size-5" /> : <Bot className="size-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {isComplete
                    ? "Ready for retrieval"
                    : isFailed
                      ? "Pipeline interrupted"
                      : "Pipeline in progress"}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {isComplete
                    ? "This document is indexed and can be used in grounded answers."
                    : isFailed
                      ? "Review the failure details, then re-run ingestion."
                      : "Artifacts will become available as each stage finishes."}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
                <span className="text-gray-500">Vector coverage</span>
                <span className="tabular-nums text-gray-800">{vectorProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
                  style={{ width: `${vectorProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-5 divide-y divide-gray-100 border-y border-gray-100">
              <ResultRow icon={Blocks} label="Elements detected" value={metrics?.elementsDetected} />
              <ResultRow icon={Layers3} label="Vectorized chunks" value={vectorizedChunks} />
              <ResultRow icon={Network} label="Graph entities" value={metrics?.graphEntities} />
              <ResultRow icon={Network} label="Graph relations" value={metrics?.graphRelations} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
          <h2 className="text-sm font-bold text-gray-950">Runtime profile</h2>
          <div className="mt-4 space-y-4">
            <RuntimeField label="Embedding model" value={metrics?.embeddingModel} />
            <RuntimeField label="Summary model" value={metrics?.summaryModel} />
            <RuntimeField label="Vector store" value={metrics?.vectorStore} />
          </div>
        </section>
      </aside>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  tone: "indigo" | "violet" | "sky" | "amber";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    violet: "bg-violet-50 text-violet-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold tracking-tight text-gray-950">{value}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function ContentComposition({
  counts,
  onOpenChunks,
}: {
  counts: Array<{ type: string; count: number }>;
  onOpenChunks: () => void;
}) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-5 py-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)] sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-950">Content composition</h2>
          <p className="mt-1 text-xs text-gray-500">Detected formats across stored chunks.</p>
        </div>
        <button
          type="button"
          onClick={onOpenChunks}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          Inspect chunks <ArrowUpRight className="size-3.5" />
        </button>
      </div>

      {counts.length > 0 ? (
        <>
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
            {counts.map((item, index) => (
              <div
                key={item.type}
                title={`${item.type}: ${item.count}`}
                style={{
                  width: `${(item.count / total) * 100}%`,
                  backgroundColor: COMPOSITION_COLORS[index % COMPOSITION_COLORS.length],
                }}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {counts.map((item) => (
              <div key={item.type} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-2.5 py-2">
                <ContentTypeBadge type={item.type} />
                <span className="text-[11px] font-semibold tabular-nums text-gray-500">
                  {item.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm text-gray-400">No content types have been detected yet.</p>
      )}
    </section>
  );
}

function ResultRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Blocks;
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className="size-4 text-gray-400" />
      <span className="flex-1 text-xs font-medium text-gray-600">{label}</span>
      <span className="text-xs font-bold tabular-nums text-gray-900">
        {value?.toLocaleString() ?? "—"}
      </span>
    </div>
  );
}

function RuntimeField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-gray-700" title={value ?? undefined}>
        {value ?? "Not reported"}
      </p>
    </div>
  );
}
