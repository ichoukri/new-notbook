import { Database, Download, FileText, Layers, Loader2, Sparkles, Terminal } from "lucide-react";
import {
  Hero,
  IngestionShell,
  MotionItem,
  MotionStack,
  Panel,
  PipelineStepper,
  StatCard,
  StatusPill,
} from "@/components/ingestion/ui";
import {
  type TIngestionChunk,
  type TIngestionDocument,
  type TIngestionPipelineStep,
  formatIngestionLogTime,
  getDocumentPreview,
  getDocumentStatusLabel,
  getIngestionLogs,
  getIngestionMetrics,
  getIngestionProgress,
} from "@/core/ingestions";
import { formatFileSize } from "@/core/datasets";
import { cn } from "@/lib/utils";
import { downloadLogs } from "./download-logs";

export function PipelineStatusView({
  document,
  datasetName,
  pipeline,
  chunks,
  isLoadingChunks,
  pageError,
}: {
  document: TIngestionDocument;
  datasetName: string;
  pipeline: TIngestionPipelineStep[];
  chunks: TIngestionChunk[];
  isLoadingChunks: boolean;
  pageError: string;
}) {
  const progress = getIngestionProgress(document);
  const metrics = getIngestionMetrics(document);
  const logs = getIngestionLogs(document);
  const preview = getDocumentPreview(chunks);
  const currentStep =
    pipeline.find((step) => step.status === "active") ??
    pipeline.find((step) => step.status === "error") ??
    pipeline[pipeline.length - 1];

  return (
    <IngestionShell
      title={
        document.mode === "guided"
          ? "Guided Ingestion Status"
          : "Auto Ingestion Status"
      }
    >
      <Hero
        icon={FileText}
        title={document.filename}
        mode={document.mode}
        meta={
          <>
            <span className="inline-flex items-center gap-1">
              <Database className="size-3.5 text-gray-400" />
              {datasetName}
            </span>
            <span className="text-gray-300">•</span>
            <span>{formatFileSize(document.fileSize)}</span>
          </>
        }
        status={
          <StatusPill
            label={getDocumentStatusLabel(document.processingStatus)}
            tone="amber"
            pulse
          />
        }
      />

      <PipelineStepper steps={pipeline} />

      <MotionStack className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <MotionItem className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {currentStep?.label ?? "Preparing"}…
              </span>
              <span className="text-sm font-semibold tabular-nums text-gray-500">
                {progress}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </MotionItem>

          <MotionItem className="grid gap-3 sm:grid-cols-2">
            <StatCard
              icon={Layers}
              tone="blue"
              label="Elements detected"
              hint="Text, tables, images, titles"
              value={metrics.elementsDetected?.toLocaleString() ?? "—"}
              active={
                currentStep?.key === "load_detect" ||
                currentStep?.key === "extract" ||
                currentStep?.key === "normalize"
              }
            />
            <StatCard
              icon={Layers}
              tone="violet"
              label="Chunks generated"
              hint="Semantic chunks created"
              value={metrics.totalChunks?.toLocaleString() ?? "—"}
              active={currentStep?.key === "chunking"}
            />
            <StatCard
              icon={Sparkles}
              tone="amber"
              label="Summaries processed"
              hint="Search-ready chunk summaries"
              value={
                metrics.totalChunks && metrics.processedChunks !== null
                  ? `${metrics.processedChunks}/${metrics.totalChunks}`
                  : "—"
              }
              active={
                currentStep?.key === "embed_text" ||
                currentStep?.key === "metadata"
              }
            />
            <StatCard
              icon={Database}
              tone="emerald"
              label="Vectors indexed"
              hint="Embeddings stored for retrieval"
              value={metrics.vectorizedChunks?.toLocaleString() ?? "—"}
              active={
                currentStep?.key === "embedding" || currentStep?.key === "index"
              }
            />
          </MotionItem>

          <MotionItem>
            <Panel
              icon={Terminal}
              title="Live logs"
              actions={
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  onClick={() => downloadLogs(document.filename, logs)}
                  disabled={logs.length === 0}
                >
                  <Download className="size-3" /> Download
                </button>
              }
              bodyClassName="max-h-60 space-y-1.5 overflow-y-auto bg-gray-950 p-4 font-mono text-xs"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500">
                  Waiting for ingestion worker logs…
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={`${log.timestamp}-${log.message}`}
                    className="flex gap-3"
                  >
                    <span className="shrink-0 text-gray-500">
                      {formatIngestionLogTime(log.timestamp)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0",
                        log.level === "error" && "text-red-400",
                        log.level === "warn" && "text-amber-400",
                        log.level === "info" && "text-emerald-400",
                      )}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                ))
              )}
              {currentStep && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">live</span>
                  <span className="text-indigo-300">
                    [{currentStep.label.toUpperCase()}]
                  </span>
                  <span className="text-gray-400">
                    Pipeline status refreshing
                    <span className="animate-pulse">…</span>
                  </span>
                </div>
              )}
            </Panel>
          </MotionItem>
        </div>

        <div className="space-y-5">
          <MotionItem>
            <Panel icon={FileText} title="Ingestion summary">
              <div className="space-y-3">
                <SummaryRow
                  icon={FileText}
                  label="Source file"
                  value={document.filename}
                  color="text-gray-400"
                />
                <SummaryRow
                  icon={Database}
                  label="Dataset"
                  value={datasetName}
                  color="text-indigo-400"
                />
                <SummaryRow
                  icon={Layers}
                  label="Elements detected"
                  value={
                    metrics.elementsDetected?.toLocaleString() ?? "Processing"
                  }
                  color="text-blue-400"
                />
                <SummaryRow
                  icon={Layers}
                  label="Chunks generated"
                  value={metrics.totalChunks?.toLocaleString() ?? "Pending"}
                  color="text-violet-400"
                />
                <SummaryRow
                  icon={Sparkles}
                  label="Embedding model"
                  value={metrics.embeddingModel ?? "Pending"}
                  color="text-emerald-400"
                />
                <SummaryRow
                  icon={Database}
                  label="Vector store"
                  value={metrics.vectorStore ?? "Pending"}
                  color="text-amber-400"
                />
              </div>
            </Panel>
          </MotionItem>

          <MotionItem>
            <Panel
              icon={Sparkles}
              title="Extracted preview"
              actions={
                isLoadingChunks ? (
                  <Loader2 className="size-4 animate-spin text-gray-400" />
                ) : undefined
              }
            >
              <div className="min-h-28 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                {preview ??
                  "Chunk previews will appear here once the document reaches the summarisation stage."}
              </div>
            </Panel>
          </MotionItem>

          {pageError && (
            <MotionItem className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {pageError}
            </MotionItem>
          )}
        </div>
      </MotionStack>
    </IngestionShell>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`size-4 mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="truncate text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}
