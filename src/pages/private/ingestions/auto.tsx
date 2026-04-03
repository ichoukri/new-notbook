import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendChunk,
  type TBackendDocument,
  type TBackendDocumentMutationResponse,
  type TIngestionChunk,
  type TIngestionDocument,
  type TIngestionLog,
  buildDocumentStatusStreamUrl,
  formatIngestionLogTime,
  getDocumentPreview,
  getDocumentStatusLabel,
  getIngestionError,
  getIngestionLogs,
  getIngestionMetrics,
  getIngestionPipeline,
  getIngestionProgress,
  mapBackendChunk,
  mapBackendDocument,
} from "@/core/ingestions";
import { formatFileSize } from "@/core/datasets";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Database,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";

type MetricCardStatus = "complete" | "active" | "pending" | "error";

export default function AutoModePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("document_id")?.trim() ?? "";
  const requestedDatasetId = searchParams.get("dataset_id")?.trim() ?? "";

  const [document, setDocument] = useState<TIngestionDocument | null>(null);
  const [dataset, setDataset] = useState<TDataset | null>(null);
  const [chunks, setChunks] = useState<TIngestionChunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [pageError, setPageError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      if (!documentId) {
        setDocument(null);
        setIsLoading(false);
        setPageError("Missing document identifier. Start ingestion from the upload flow.");
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const response = await backendApi.get<TBackendDocument>(`/documents/${documentId}`);
        if (!cancelled) {
          setDocument(mapBackendDocument(response));
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(getApiErrorMessage(error, "Could not load ingestion status."));
          setDocument(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const effectiveDatasetId = requestedDatasetId || document?.datasetIds[0] || "";

  useEffect(() => {
    let cancelled = false;

    const loadDataset = async () => {
      if (!effectiveDatasetId) {
        setDataset(null);
        return;
      }

      try {
        const response = await backendApi.get<TBackendDataset>(`/datasets/${effectiveDatasetId}`);
        if (!cancelled) {
          setDataset(mapBackendDataset(response));
        }
      } catch {
        if (!cancelled) {
          setDataset(null);
        }
      }
    };

    void loadDataset();

    return () => {
      cancelled = true;
    };
  }, [effectiveDatasetId]);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let disposed = false;
    const stream = new EventSource(
      buildDocumentStatusStreamUrl({
        documentId,
      }),
    );

    const handleStatus = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as TBackendDocument;
        if (!disposed && payload.id === documentId) {
          setDocument(mapBackendDocument(payload));
          setPageError("");
        }
      } catch {
        // Ignore malformed messages and keep the stream alive.
      }
    };

    const handleDelete = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { id?: string };
        if (!disposed && payload.id === documentId) {
          setPageError("This document was deleted while ingestion was in progress.");
        }
      } catch {
        // Ignore malformed messages and keep the stream alive.
      }
    };

    stream.addEventListener("document_status", handleStatus as EventListener);
    stream.addEventListener("document_deleted", handleDelete as EventListener);

    stream.onerror = () => {
      if (!disposed) {
        void backendApi
          .get<TBackendDocument>(`/documents/${documentId}`)
          .then((response) => {
            setDocument(mapBackendDocument(response));
          })
          .catch(() => {
            // Ignore transient stream refresh failures.
          });
      }
    };

    return () => {
      disposed = true;
      stream.close();
    };
  }, [documentId]);

  useEffect(() => {
    if (!document?.id) {
      setChunks([]);
      return;
    }

    const shouldLoadChunks =
      document.processingStatus === "vectorization" ||
      document.processingStatus === "completed" ||
      document.processingStatus === "failed";

    if (!shouldLoadChunks) {
      return;
    }

    let cancelled = false;

    const loadChunks = async () => {
      setIsLoadingChunks(true);

      try {
        const response = await backendApi.findMany<TBackendChunk>(
          `/chunks/document/${document.id}`,
          {
            active_only: "true",
          },
        );

        if (!cancelled) {
          setChunks(response.map(mapBackendChunk));
        }
      } catch {
        if (!cancelled) {
          setChunks([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingChunks(false);
        }
      }
    };

    void loadChunks();

    return () => {
      cancelled = true;
    };
  }, [document?.id, document?.processingStatus, document?.updatedAt]);

  const handleRetry = async () => {
    if (!document?.id || !effectiveDatasetId || isRetrying) {
      return;
    }

    setIsRetrying(true);

    try {
      const response = await backendApi.create<
        TBackendDocumentMutationResponse,
        undefined
      >(
        `/documents/${effectiveDatasetId}/confirm?document_id=${document.id}`,
        undefined,
      );
      setDocument(mapBackendDocument(response.data));
      setChunks([]);
      toast.success("Ingestion restarted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not retry ingestion."));
    } finally {
      setIsRetrying(false);
    }
  };

  if (!documentId) {
    return (
      <MissingState
        message="Missing document identifier. Start ingestion from the upload flow."
        onNavigate={navigate}
      />
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!document) {
    return (
      <MissingState
        message={pageError || "Could not load this ingestion."}
        onNavigate={navigate}
      />
    );
  }

  const pipeline = getIngestionPipeline(document);
  const progress = getIngestionProgress(document);
  const metrics = getIngestionMetrics(document);
  const logs = getIngestionLogs(document);
  const preview = getDocumentPreview(chunks);
  const currentStep =
    pipeline.find((step) => step.status === "active") ??
    pipeline.find((step) => step.status === "error") ??
    pipeline[pipeline.length - 1];
  const datasetName = dataset?.name ?? "Unknown Dataset";
  const ingestionError = getIngestionError(document) ?? pageError;

  if (document.processingStatus === "failed") {
    return (
      <ErrorState
        document={document}
        datasetName={datasetName}
        errorMessage={ingestionError || "Ingestion failed."}
        logs={logs}
        onRetry={() => void handleRetry()}
        isRetrying={isRetrying}
      />
    );
  }

  if (document.processingStatus === "completed") {
    return (
      <SuccessState
        document={document}
        datasetId={effectiveDatasetId}
        datasetName={datasetName}
        metrics={metrics}
        onNavigate={navigate}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Auto Mode Ingestion" breadcrumbs={[{ label: "Ingestions" }]} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="size-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {document.filename}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                    <span>{datasetName}</span>
                    <ChevronRight className="size-3" />
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                      Auto Mode
                    </span>
                    <span>{formatFileSize(document.fileSize)}</span>
                  </div>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 flex-shrink-0">
                <Loader2 className="size-3.5 animate-spin" />
                {getDocumentStatusLabel(document.processingStatus)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 overflow-x-auto">
            <div className="flex items-center min-w-[920px]">
              {pipeline.map((step, index) => (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        step.status === "complete" && "bg-emerald-500",
                        step.status === "active" && "bg-indigo-600 ring-4 ring-indigo-100",
                        step.status === "error" && "bg-red-500",
                        step.status === "pending" && "bg-gray-100",
                      )}
                    >
                      {step.status === "complete" ? (
                        <CheckCircle2 className="size-4 text-white" />
                      ) : step.status === "active" ? (
                        <Loader2 className="size-4 text-white animate-spin" />
                      ) : step.status === "error" ? (
                        <AlertCircle className="size-4 text-white" />
                      ) : (
                        <Circle className="size-4 text-gray-300" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1.5 text-center whitespace-nowrap",
                        step.status === "active" && "text-indigo-700 font-semibold",
                        step.status === "complete" && "text-emerald-600 font-medium",
                        step.status === "error" && "text-red-600 font-medium",
                        step.status === "pending" && "text-gray-400",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < pipeline.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-2 rounded-full mt-[-16px] transition-all",
                        step.status === "complete" ? "bg-emerald-400" : "bg-gray-100",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {currentStep?.label ?? "Preparing"}…
                  </span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Elements Detected"
                  value={metrics.elementsDetected?.toLocaleString() ?? "—"}
                  status={resolveMetricStatus(
                    metrics.elementsDetected !== null,
                    currentStep?.key === "load_detect" ||
                      currentStep?.key === "extract" ||
                      currentStep?.key === "normalize",
                  )}
                  subtitle="Text, tables, images, and titles"
                />
                <MetricCard
                  label="Chunks Generated"
                  value={metrics.totalChunks?.toLocaleString() ?? "—"}
                  status={resolveMetricStatus(
                    metrics.totalChunks !== null,
                    currentStep?.key === "chunking",
                  )}
                  subtitle="Semantic chunks created"
                />
                <MetricCard
                  label="Summaries Processed"
                  value={
                    metrics.totalChunks && metrics.processedChunks !== null
                      ? `${metrics.processedChunks}/${metrics.totalChunks}`
                      : "—"
                  }
                  status={resolveMetricStatus(
                    metrics.storedChunks !== null,
                    currentStep?.key === "embed_text" || currentStep?.key === "metadata",
                  )}
                  subtitle="Search-ready chunk summaries"
                />
                <MetricCard
                  label="Vectors Indexed"
                  value={metrics.vectorizedChunks?.toLocaleString() ?? "—"}
                  status={resolveMetricStatus(
                    metrics.vectorizedChunks !== null,
                    currentStep?.key === "embedding" || currentStep?.key === "index",
                  )}
                  subtitle="Embeddings stored for retrieval"
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">Live Logs</h3>
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    onClick={() => downloadLogs(document.filename, logs)}
                    disabled={logs.length === 0}
                  >
                    <Download className="size-3" /> Download
                  </button>
                </div>
                <div className="bg-gray-950 p-4 font-mono text-xs space-y-1.5 max-h-56 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-gray-500">
                      Waiting for ingestion worker logs…
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={`${log.timestamp}-${log.message}`} className="flex gap-3">
                        <span className="text-gray-500 flex-shrink-0">
                          {formatIngestionLogTime(log.timestamp)}
                        </span>
                        <span
                          className={cn(
                            "flex-shrink-0",
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
                    <div className="flex gap-3 items-center">
                      <span className="text-gray-500">live</span>
                      <span className="text-indigo-300">[{currentStep.label.toUpperCase()}]</span>
                      <span className="text-gray-400">
                        Pipeline status refreshing
                        <span className="animate-pulse">…</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Ingestion Summary
                </h3>
                <div className="space-y-3">
                  <SummaryRow
                    icon={FileText}
                    label="Source File"
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
                    label="Elements Detected"
                    value={
                      metrics.elementsDetected?.toLocaleString() ?? "Processing"
                    }
                    color="text-blue-400"
                  />
                  <SummaryRow
                    icon={Layers}
                    label="Chunks Generated"
                    value={metrics.totalChunks?.toLocaleString() ?? "Pending"}
                    color="text-violet-400"
                  />
                  <SummaryRow
                    icon={Sparkles}
                    label="Embedding Model"
                    value={metrics.embeddingModel ?? "Pending"}
                    color="text-emerald-400"
                  />
                  <SummaryRow
                    icon={Database}
                    label="Vector Store"
                    value={metrics.vectorStore ?? "Pending"}
                    color="text-amber-400"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Extracted Preview
                  </h3>
                  {isLoadingChunks && (
                    <Loader2 className="size-4 text-gray-400 animate-spin" />
                  )}
                </div>
                <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed min-h-28">
                  {preview ? (
                    preview
                  ) : (
                    "Chunk previews will appear here once the document reaches the metadata stage."
                  )}
                </div>
              </div>

              {pageError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {pageError}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
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
      <Icon className={`size-4 mt-0.5 flex-shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  status,
  subtitle,
}: {
  label: string;
  value: string;
  status: MetricCardStatus;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <StepStatusPill status={status} />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

function StepStatusPill({ status }: { status: MetricCardStatus }) {
  const styles: Record<MetricCardStatus, string> = {
    complete: "bg-emerald-50 text-emerald-700",
    active: "bg-indigo-50 text-indigo-700",
    pending: "bg-gray-100 text-gray-500",
    error: "bg-red-50 text-red-700",
  };

  const labels: Record<MetricCardStatus, string> = {
    complete: "Done",
    active: "Active",
    pending: "Pending",
    error: "Failed",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function SuccessState({
  document,
  datasetId,
  datasetName,
  metrics,
  onNavigate,
}: {
  document: TIngestionDocument;
  datasetId: string;
  datasetName: string;
  metrics: ReturnType<typeof getIngestionMetrics>;
  onNavigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Ingestion Complete" breadcrumbs={[{ label: "Ingestions" }]} />
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Ingestion Complete
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {document.filename} has been processed and indexed into {datasetName}.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              {
                label: "Elements Detected",
                value: metrics.elementsDetected?.toLocaleString() ?? "—",
              },
              {
                label: "Chunks Indexed",
                value: metrics.vectorizedChunks?.toLocaleString() ?? "—",
              },
              {
                label: "Embedding Model",
                value: metrics.embeddingModel ?? "—",
              },
              {
                label: "Vector Store",
                value: metrics.vectorStore ?? "—",
              },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-lg font-bold text-gray-900 break-words">
                  {item.value}
                </p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {datasetId && (
              <Button size="sm" onClick={() => onNavigate(`/datasets/${datasetId}`)}>
                <ExternalLink className="size-4 mr-1.5" />
                Open Dataset
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("/datasets")}
            >
              Browse Datasets
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("/ingestions/new")}
            >
              Upload Another
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ErrorState({
  document,
  datasetName,
  errorMessage,
  logs,
  onRetry,
  isRetrying,
}: {
  document: TIngestionDocument;
  datasetName: string;
  errorMessage: string;
  logs: TIngestionLog[];
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Ingestion Failed" breadcrumbs={[{ label: "Ingestions" }]} />
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="size-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ingestion Failed</h2>
          <p className="text-sm text-gray-500 mb-2">
            {document.filename} could not finish processing into {datasetName}.
          </p>
          <p className="text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-6 text-left">
            {errorMessage}
          </p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="size-4 mr-1.5" />
              )}
              Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadLogs(document.filename, logs)}
              disabled={logs.length === 0}
            >
              <Download className="size-4 mr-1.5" />
              Download Logs
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Auto Mode Ingestion" breadcrumbs={[{ label: "Ingestions" }]} />
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading ingestion status…
        </div>
      </main>
    </div>
  );
}

function MissingState({
  message,
  onNavigate,
}: {
  message: string;
  onNavigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Auto Mode Ingestion" breadcrumbs={[{ label: "Ingestions" }]} />
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Upload className="size-6 text-gray-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No Active Ingestion</h2>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <Button onClick={() => onNavigate("/ingestions/new")}>
            Start New Ingestion
          </Button>
        </div>
      </main>
    </div>
  );
}

function resolveMetricStatus(
  isComplete: boolean,
  isActive: boolean,
): MetricCardStatus {
  if (isComplete) {
    return "complete";
  }

  if (isActive) {
    return "active";
  }

  return "pending";
}

function downloadLogs(filename: string, logs: TIngestionLog[]) {
  if (logs.length === 0) {
    return;
  }

  const content = logs
    .map(
      (log) =>
        `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`,
    )
    .join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename.replace(/\.[^.]+$/, "") || "ingestion"}-logs.txt`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
