import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { backendApi, buildChunkAssetUrl } from "@/core/api";
import { getApiErrorMessage, getApiErrorStatus } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendChunk,
  type TBackendDocument,
  type TAccessVisibility,
  type TBackendDocumentMutationResponse,
  type TChunkEditOperation,
  type TDocumentMetadataPayload,
  type TIngestionChunk,
  type TIngestionDocument,
  type TIngestionLog,
  buildDocumentStatusStreamUrl,
  formatIngestionLogTime,
  getAwaitingApprovalStage,
  isMetadataReview,
  getChunkImageUrls,
  getDocumentPreview,
  getDocumentStatusLabel,
  getIngestionError,
  getIngestionErrorTraceback,
  getIngestionFailedStage,
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
  ActionBar,
  CenteredCard,
  Hero,
  IngestionShell,
  MotionItem,
  MotionStack,
  Panel,
  PipelineStepper,
  StatCard,
  StatusIcon,
  StatusPill,
} from "@/components/ingestion/ui";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Combine,
  Database,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Save,
  Scissors,
  Shield,
  Sparkles,
  Square,
  Tag,
  Terminal,
  Trash2,
  Undo2,
  Upload,
  Users,
  X,
} from "lucide-react";

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
  const [isApproving, setIsApproving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEditingChunks, setIsEditingChunks] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isSavingRemovals, setIsSavingRemovals] = useState(false);
  const [partitionOutput, setPartitionOutput] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      if (!documentId) {
        setDocument(null);
        setIsLoading(false);
        setPageError(
          "Missing document identifier. Start ingestion from the upload flow.",
        );
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const response = await backendApi.get<TBackendDocument>(
          `/documents/${documentId}`,
        );
        if (!cancelled) {
          setDocument(mapBackendDocument(response));
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            getApiErrorMessage(error, "Could not load ingestion status."),
          );
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

  const effectiveDatasetId =
    requestedDatasetId || document?.datasetIds[0] || "";

  useEffect(() => {
    let cancelled = false;

    const loadDataset = async () => {
      if (!effectiveDatasetId) {
        setDataset(null);
        return;
      }

      try {
        const response = await backendApi.get<TBackendDataset>(
          `/datasets/${effectiveDatasetId}`,
        );
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
      { withCredentials: true },
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
          setPageError(
            "This document was deleted while ingestion was in progress.",
          );
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
      document.processingStatus === "failed" ||
      // Guided pauses need the chunk list visible for review.
      document.processingStatus === "chunking_awaiting_approval" ||
      document.processingStatus === "summarising_awaiting_approval" ||
      document.processingStatus === "vectorization_awaiting_approval";

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

  // Fetch the partition stage's output when paused for partition review.
  // The backend returns a small dict like
  // ``{"elements_found": {"text": 46, "titles": 43, ...}}`` which we display
  // as a per-element-type breakdown in the AwaitingApprovalState.
  useEffect(() => {
    if (!document?.id) {
      setPartitionOutput(null);
      return;
    }
    if (document.processingStatus !== "partitioning_awaiting_approval") {
      setPartitionOutput(null);
      return;
    }
    let cancelled = false;
    backendApi
      .get<{ stage: string; output: Record<string, unknown> | null }>(
        `/documents/${document.id}/stages/partition/output`,
      )
      .then((response) => {
        if (!cancelled) setPartitionOutput(response.output ?? null);
      })
      .catch(() => {
        if (!cancelled) setPartitionOutput(null);
      });
    return () => {
      cancelled = true;
    };
  }, [document?.id, document?.processingStatus]);

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
      // 409 means the backend already has a task running for this document
      // (e.g. the user clicked retry twice quickly). Surface that as info,
      // not error — there's nothing wrong, the work is just already underway.
      if (getApiErrorStatus(error) === 409) {
        toast.info(getApiErrorMessage(error, "Ingestion is already running."));
      } else {
        toast.error(getApiErrorMessage(error, "Could not retry ingestion."));
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleApprove = async () => {
    if (!document?.id || isApproving) return;
    const stage = getAwaitingApprovalStage(document);
    if (!stage) return;

    setIsApproving(true);
    try {
      const response = await backendApi.create<
        TBackendDocumentMutationResponse,
        undefined
      >(`/documents/${document.id}/stages/${stage}/approve`, undefined);
      setDocument(mapBackendDocument(response.data));
      toast.success("Stage approved. Continuing to the next step.");
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        toast.info(getApiErrorMessage(error, "Ingestion is already running."));
      } else {
        toast.error(getApiErrorMessage(error, "Could not approve this stage."));
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleEditChunks = async (operations: TChunkEditOperation[]) => {
    if (!document?.id || operations.length === 0 || isEditingChunks) return;
    const stage = getAwaitingApprovalStage(document);
    if (!stage) return;

    setIsEditingChunks(true);
    try {
      const response = await backendApi.create<
        TBackendDocumentMutationResponse,
        { operations: TChunkEditOperation[] }
      >(`/documents/${document.id}/stages/${stage}/edit`, { operations });
      setDocument(mapBackendDocument(response.data));
      // Force the chunk-loading effect to refetch the rebuilt version.
      setChunks([]);
      toast.success("Chunks updated. Review and approve to continue.");
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        toast.info(getApiErrorMessage(error, "Ingestion is already running."));
      } else {
        toast.error(getApiErrorMessage(error, "Could not apply chunk edits."));
      }
    } finally {
      setIsEditingChunks(false);
    }
  };

  const handleSaveRemovals = async (removedIndices: number[]) => {
    if (!document?.id || isSavingRemovals) return;
    setIsSavingRemovals(true);
    try {
      const response = await backendApi.create<
        TBackendDocumentMutationResponse,
        { removed_indices: number[] }
      >(`/documents/${document.id}/stages/partition/elements`, {
        removed_indices: removedIndices,
      });
      const mapped = mapBackendDocument(response.data);
      setDocument(mapped);
      // Keep the locally-fetched partition output in sync with the saved set.
      const partitioning = (mapped.processingDetails ?? {})["partitioning"];
      if (partitioning && typeof partitioning === "object") {
        setPartitionOutput(partitioning as Record<string, unknown>);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update elements."));
    } finally {
      setIsSavingRemovals(false);
    }
  };

  const handleSaveMetadata = async (payload: TDocumentMetadataPayload) => {
    if (!document?.id || isSavingMetadata) return;
    setIsSavingMetadata(true);
    try {
      const response = await backendApi.create<
        TBackendDocumentMutationResponse,
        TDocumentMetadataPayload
      >(`/documents/${document.id}/metadata`, payload);
      setDocument(mapBackendDocument(response.data));
      toast.success(
        payload.complete ? "Document completed." : "Metadata saved.",
      );
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        toast.info(getApiErrorMessage(error, "Ingestion is already running."));
      } else {
        toast.error(getApiErrorMessage(error, "Could not save metadata."));
      }
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleCancel = async () => {
    if (!document?.id || isCancelling) return;
    setIsCancelling(true);
    try {
      const response = await backendApi.create<
        TBackendDocumentMutationResponse,
        undefined
      >(`/documents/${document.id}/cancel`, undefined);
      setDocument(mapBackendDocument(response.data));
      toast.success("Ingestion cancelled.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not cancel ingestion."));
    } finally {
      setIsCancelling(false);
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
        errorTraceback={getIngestionErrorTraceback(document)}
        failedStage={getIngestionFailedStage(document)}
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

  if (document.processingStatus === "cancelled") {
    return (
      <CancelledState
        document={document}
        datasetName={datasetName}
        onNavigate={navigate}
      />
    );
  }

  if (isMetadataReview(document)) {
    return (
      <MetadataReviewState
        document={document}
        datasetName={datasetName}
        pipeline={pipeline}
        onSave={(payload) => void handleSaveMetadata(payload)}
        onCancel={() => void handleCancel()}
        isSaving={isSavingMetadata}
        isCancelling={isCancelling}
      />
    );
  }

  const awaitingStage = getAwaitingApprovalStage(document);
  if (awaitingStage) {
    return (
      <AwaitingApprovalState
        document={document}
        datasetName={datasetName}
        pipeline={pipeline}
        stage={awaitingStage}
        chunks={chunks}
        isLoadingChunks={isLoadingChunks}
        partitionOutput={partitionOutput}
        onApprove={() => void handleApprove()}
        onCancel={() => void handleCancel()}
        onSubmitEdits={(ops) => void handleEditChunks(ops)}
        onSaveRemovals={(indices) => void handleSaveRemovals(indices)}
        isApproving={isApproving}
        isCancelling={isCancelling}
        isEditingChunks={isEditingChunks}
        isSavingRemovals={isSavingRemovals}
      />
    );
  }

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
        mode="auto"
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
    <IngestionShell title="Ingestion Complete" center>
      <CenteredCard>
        <StatusIcon icon={CheckCircle2} tone="emerald" />
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Ingestion complete
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          {document.filename} has been processed and indexed into {datasetName}.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3">
          {[
            {
              label: "Elements detected",
              value: metrics.elementsDetected?.toLocaleString() ?? "—",
            },
            {
              label: "Chunks indexed",
              value: metrics.vectorizedChunks?.toLocaleString() ?? "—",
            },
            { label: "Embedding model", value: metrics.embeddingModel ?? "—" },
            { label: "Vector store", value: metrics.vectorStore ?? "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-gray-50 p-3">
              <p className="wrap-break-word text-lg font-bold text-gray-900">
                {item.value}
              </p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {datasetId && (
            <Button size="sm" onClick={() => onNavigate(`/datasets/${datasetId}`)}>
              <ExternalLink className="mr-1.5 size-4" />
              Open dataset
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("/datasets")}
          >
            Browse datasets
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("/ingestions/new")}
          >
            Upload another
          </Button>
        </div>
      </CenteredCard>
    </IngestionShell>
  );
}

function ErrorState({
  document,
  datasetName,
  errorMessage,
  errorTraceback,
  failedStage,
  logs,
  onRetry,
  isRetrying,
}: {
  document: TIngestionDocument;
  datasetName: string;
  errorMessage: string;
  errorTraceback: string | null;
  failedStage: string | null;
  logs: TIngestionLog[];
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const [showTraceback, setShowTraceback] = useState(false);

  return (
    <IngestionShell title="Ingestion Failed" center>
      <div className="w-full max-w-2xl">
        <CenteredCard>
          <StatusIcon icon={AlertCircle} tone="red" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Ingestion failed
          </h2>
          <p className="mb-2 text-sm text-gray-500">
            {document.filename} could not finish processing into {datasetName}.
          </p>
          {failedStage && (
            <p className="mb-2 text-xs text-gray-500">
              Stage:{" "}
              <span className="font-medium text-gray-700">
                {getDocumentStatusLabel(failedStage)}
              </span>
            </p>
          )}
          <p className="wrap-break-word mb-4 whitespace-pre-wrap rounded-xl bg-red-50 px-4 py-3 text-left text-xs text-red-600">
            {errorMessage}
          </p>
          {errorTraceback && (
            <div className="mb-6 text-left">
              <button
                type="button"
                onClick={() => setShowTraceback((v) => !v)}
                className="mb-2 text-xs text-gray-500 underline hover:text-gray-700"
              >
                {showTraceback ? "Hide" : "Show"} technical details
              </button>
              {showTraceback && (
                <pre className="max-h-96 overflow-auto whitespace-pre rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[11px] text-gray-700">
                  {errorTraceback}
                </pre>
              )}
            </div>
          )}
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-4" />
              )}
              Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadLogs(document.filename, logs)}
              disabled={logs.length === 0}
            >
              <Download className="mr-1.5 size-4" />
              Download logs
            </Button>
          </div>
        </CenteredCard>
      </div>
    </IngestionShell>
  );
}

const STAGE_DISPLAY_NAMES: Record<string, string> = {
  partition: "Extraction",
  chunking: "Chunking",
  summarising: "Summarisation",
  vectorization: "Vectorisation",
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  partition:
    "The document has been partitioned. Review the extracted structure and approve to continue with chunking.",
  chunking:
    "Chunks have been generated. Review them and approve to continue with summarisation.",
  summarising:
    "AI summaries are ready. Review the search-ready content and approve to continue with vectorisation.",
  vectorization:
    "Vectors are written. Approve to finalize the document and make it searchable.",
};

function AwaitingApprovalState({
  document,
  datasetName,
  pipeline,
  stage,
  chunks,
  isLoadingChunks,
  partitionOutput,
  onApprove,
  onCancel,
  onSubmitEdits,
  onSaveRemovals,
  isApproving,
  isCancelling,
  isEditingChunks,
  isSavingRemovals,
}: {
  document: TIngestionDocument;
  datasetName: string;
  pipeline: ReturnType<typeof getIngestionPipeline>;
  stage: string;
  chunks: TIngestionChunk[];
  isLoadingChunks: boolean;
  partitionOutput: Record<string, unknown> | null;
  onApprove: () => void;
  onCancel: () => void;
  onSubmitEdits: (operations: TChunkEditOperation[]) => void;
  onSaveRemovals: (removedIndices: number[]) => void;
  isApproving: boolean;
  isCancelling: boolean;
  isEditingChunks: boolean;
  isSavingRemovals: boolean;
}) {
  const stageLabel = STAGE_DISPLAY_NAMES[stage] ?? stage;
  const description =
    STAGE_DESCRIPTIONS[stage] ??
    "Review the output of this stage and approve to continue.";

  return (
    <IngestionShell title="Guided Ingestion">
      <Hero
        icon={FileText}
        title={document.filename}
        mode="guided"
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
          <StatusPill label={`${stageLabel} · review`} tone="violet" pulse />
        }
        description={description}
      />

      <PipelineStepper steps={pipeline} />

      {stage === "partition" && (
        <PartitionReview
          output={partitionOutput}
          onSaveRemovals={onSaveRemovals}
          isSaving={isSavingRemovals}
          disabled={isApproving || isCancelling}
        />
      )}
      {(stage === "chunking" ||
        stage === "summarising" ||
        stage === "vectorization") && (
        <ChunkReview
          key={`${chunks[0]?.chunkVersion ?? 0}-${chunks[0]?.id ?? "none"}-${chunks.length}`}
          chunks={chunks}
          isLoading={isLoadingChunks}
          stage={stage}
          onSubmitEdits={onSubmitEdits}
          isSubmitting={isEditingChunks}
          disabled={isApproving || isCancelling}
        />
      )}

      <ActionBar>
        <span className="mr-auto hidden text-xs text-gray-400 sm:block">
          {stageLabel} stage — approve to continue the pipeline.
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isApproving || isCancelling}
        >
          {isCancelling ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <X className="mr-1.5 size-4" />
          )}
          Cancel
        </Button>
        <Button size="sm" onClick={onApprove} disabled={isApproving || isCancelling}>
          {isApproving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1.5 size-4" />
          )}
          Approve &amp; continue
        </Button>
      </ActionBar>
    </IngestionShell>
  );
}

type PartitionElement = {
  index: number;
  type: string;
  page: number | null;
  char_count: number;
  preview: string;
  has_image: boolean;
  has_table: boolean;
};

function parsePartitionElements(value: unknown): PartitionElement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      if (typeof record.index !== "number") return null;
      return {
        index: record.index,
        type: typeof record.type === "string" ? record.type : "Element",
        page: typeof record.page === "number" ? record.page : null,
        char_count:
          typeof record.char_count === "number" ? record.char_count : 0,
        preview: typeof record.preview === "string" ? record.preview : "",
        has_image: record.has_image === true,
        has_table: record.has_table === true,
      } satisfies PartitionElement;
    })
    .filter((item): item is PartitionElement => item !== null);
}

function PartitionReview({
  output,
  onSaveRemovals,
  isSaving,
  disabled,
}: {
  output: Record<string, unknown> | null;
  onSaveRemovals: (removedIndices: number[]) => void;
  isSaving: boolean;
  disabled: boolean;
}) {
  const elements = parsePartitionElements(output?.elements);
  // Controlled by the persisted set: the row state reflects what's saved on the
  // document, so it stays correct across refetches and page revisits.
  const removed = new Set(
    Array.isArray(output?.removed_indices)
      ? (output?.removed_indices as unknown[]).filter(
          (value): value is number => typeof value === "number",
        )
      : [],
  );

  const busy = isSaving || disabled;

  const toggle = (index: number) => {
    if (busy) return;
    const next = new Set(removed);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    if (next.size >= elements.length) {
      toast.error("At least one element must remain.");
      return;
    }
    onSaveRemovals([...next].sort((a, b) => a - b));
  };

  if (!output) {
    return (
      <Panel icon={Layers} title="Extracted structure">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading partition output…
        </div>
      </Panel>
    );
  }

  // Type-count summary (always available, even for older documents).
  const elementsFound = output.elements_found;
  const counts =
    elementsFound && typeof elementsFound === "object"
      ? Object.entries(elementsFound as Record<string, unknown>)
          .map(([key, value]) => [key, Number(value) || 0] as const)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
      : [];

  return (
    <MotionStack className="space-y-5">
      {counts.length > 0 && (
        <MotionItem>
          <Panel icon={Layers} title="Extracted structure">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {counts.map(([type, count]) => (
                <div
                  key={type}
                  className="rounded-xl bg-gray-50 px-4 py-3 text-center"
                >
                  <p className="text-2xl font-bold tabular-nums text-gray-900">
                    {count}
                  </p>
                  <p className="mt-1 text-xs capitalize text-gray-500">{type}</p>
                </div>
              ))}
            </div>
          </Panel>
        </MotionItem>
      )}

      <MotionItem>
        {elements.length === 0 ? (
          <Panel icon={FileText} title="Extracted elements">
            <p className="text-sm text-gray-500">
              No per-element preview is available for this document.
            </p>
          </Panel>
        ) : (
          <Panel
            icon={FileText}
            title="Extracted elements"
            subtitle="Remove anything you don't want chunked"
            actions={
              <span className="flex items-center gap-2 text-xs text-gray-500">
                {removed.size > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                    {removed.size} removed
                  </span>
                )}
                {elements.length} total
                {isSaving && (
                  <Loader2 className="size-4 animate-spin text-violet-500" />
                )}
              </span>
            }
            bodyClassName="max-h-[600px] divide-y divide-gray-100 overflow-y-auto"
          >
            {elements.map((element) => {
              const isRemoved = removed.has(element.index);
              return (
                <div
                  key={element.index}
                  className={cn(
                    "flex gap-3 px-5 py-3.5 transition-colors",
                    isRemoved && "bg-red-50/50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="font-mono">#{element.index}</span>
                      <span className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                        {element.type}
                      </span>
                      {element.page != null && (
                        <span className="rounded bg-gray-100 px-2 py-0.5">
                          page {element.page}
                        </span>
                      )}
                      <span>{element.char_count} chars</span>
                      {element.has_table && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                          table
                        </span>
                      )}
                      {element.has_image && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                          image
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "whitespace-pre-wrap text-sm leading-relaxed",
                        isRemoved
                          ? "text-gray-400 line-through"
                          : "text-gray-800",
                      )}
                    >
                      {element.preview || (
                        <span className="italic text-gray-400">
                          (no text content)
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(element.index)}
                    disabled={busy}
                    className={cn(
                      "flex h-fit items-center gap-1 self-start rounded-lg px-2 py-1 text-xs transition-colors disabled:opacity-50",
                      isRemoved
                        ? "text-emerald-600 hover:bg-emerald-50"
                        : "text-gray-400 hover:bg-red-50 hover:text-red-600",
                    )}
                    title={
                      isRemoved ? "Keep this element" : "Remove this element"
                    }
                  >
                    {isRemoved ? (
                      <>
                        <Undo2 className="size-3.5" /> Keep
                      </>
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </Panel>
        )}
      </MotionItem>
    </MotionStack>
  );
}

// Splitting a chunk: the user separates segments with a line containing only
// three-or-more dashes. Kept in sync with the hint shown in the editor.
const SPLIT_DELIMITER = /\n-{3,}\n/;

function ChunkReview({
  chunks,
  isLoading,
  stage,
  onSubmitEdits,
  isSubmitting,
  disabled,
}: {
  chunks: TIngestionChunk[];
  isLoading: boolean;
  stage: string;
  onSubmitEdits: (operations: TChunkEditOperation[]) => void;
  isSubmitting: boolean;
  disabled: boolean;
}) {
  // Which content to surface depends on which stage just finished.
  //   chunking_awaiting_approval     → text_content (no summaries yet)
  //   summarising_awaiting_approval  → summary_content (the AI summary)
  //   vectorization_awaiting_approval → summary_content (already vectorized)
  const showSummary = stage !== "chunking";

  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [splitting, setSplitting] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Edit state resets when a fresh chunk set arrives: the caller keys this
  // component by chunk version + first id, so a rebuild remounts it clean.

  const draftOf = (chunk: TIngestionChunk) =>
    drafts[chunk.id] ?? chunk.textContent ?? "";

  const setDraft = (id: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [id]: value }));

  const toggleIn = (
    setter: Dispatch<SetStateAction<Set<string>>>,
    id: string,
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitEdit = () => {
    setEditMode(false);
    setDrafts({});
    setSplitting(new Set());
    setDeleted(new Set());
    setSelected(new Set());
  };

  const buildAndSubmit = () => {
    const ops: TChunkEditOperation[] = [];
    for (const chunk of chunks) {
      if (deleted.has(chunk.id)) {
        ops.push({ op: "delete", chunk_id: chunk.id });
        continue;
      }
      const draft = drafts[chunk.id];
      if (draft === undefined) continue;
      const original = chunk.textContent ?? "";
      if (splitting.has(chunk.id)) {
        const segments = draft
          .split(SPLIT_DELIMITER)
          .map((segment) => segment.trim())
          .filter(Boolean);
        if (segments.length >= 2) {
          ops.push({ op: "split", chunk_id: chunk.id, segments });
          continue;
        }
      }
      if (draft.trim() && draft !== original) {
        ops.push({ op: "edit", chunk_id: chunk.id, text_content: draft });
      }
    }
    if (ops.length === 0) {
      toast.info("No changes to save.");
      return;
    }
    onSubmitEdits(ops);
  };

  const mergeSelected = () => {
    const ordered = chunks.filter((chunk) => selected.has(chunk.id));
    if (ordered.length < 2) return;
    const indices = ordered.map((chunk) => chunk.chunkIndex);
    const contiguous = indices.every(
      (value, i) => i === 0 || value === indices[i - 1] + 1,
    );
    if (!contiguous) {
      toast.error("Select adjacent chunks to merge.");
      return;
    }
    onSubmitEdits([{ op: "merge", chunk_ids: ordered.map((chunk) => chunk.id) }]);
  };

  if (isLoading) {
    return (
      <Panel icon={Layers} title="Chunks">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading chunks…
        </div>
      </Panel>
    );
  }

  if (chunks.length === 0) {
    return (
      <Panel icon={Layers} title="Chunks">
        <p className="text-sm text-gray-500">No chunks available yet.</p>
      </Panel>
    );
  }

  const busy = isSubmitting || disabled;

  return (
    <Panel
      icon={Layers}
      title={
        editMode ? "Editing chunks" : showSummary ? "Chunk summaries" : "Chunk content"
      }
      subtitle={`${chunks.length} chunks · version ${chunks[0]?.chunkVersion}`}
      actions={
        <div className="flex items-center gap-2">
          {isSubmitting && (
            <Loader2 className="size-4 animate-spin text-violet-500" />
          )}
          {!editMode ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditMode(true)}
              disabled={busy}
            >
              <Pencil className="mr-1.5 size-3.5" />
              Edit chunks
            </Button>
          ) : (
            <>
              {selected.size >= 2 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={mergeSelected}
                  disabled={busy}
                >
                  <Combine className="mr-1.5 size-3.5" />
                  Merge {selected.size}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={exitEdit} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={buildAndSubmit} disabled={busy}>
                <Save className="mr-1.5 size-3.5" />
                Save changes
              </Button>
            </>
          )}
        </div>
      }
      bodyClassName=""
    >
      {editMode && (
        <div className="border-b border-violet-100 bg-violet-50/60 px-5 py-2.5 text-xs text-violet-700">
          Edit chunk text inline, split a chunk by separating segments with a
          line of <code className="font-mono">---</code>, delete chunks, or tick
          adjacent chunks and merge them. Saving rebuilds the chunk version and
          re-runs summarisation &amp; vectorisation for changed chunks.
        </div>
      )}

      <div className="max-h-[600px] divide-y divide-gray-100 overflow-y-auto">
        {chunks.map((chunk) => {
          const imageUrls = getChunkImageUrls(chunk);
          const isDeleted = deleted.has(chunk.id);
          const isSplitting = splitting.has(chunk.id);
          const isSelected = selected.has(chunk.id);
          const body = showSummary
            ? chunk.summaryContent || chunk.textContent
            : chunk.textContent || chunk.summaryContent;

          return (
            <div
              key={chunk.id}
              className={cn(
                "px-5 py-4",
                isDeleted && "bg-red-50/50 opacity-70",
                isSelected && "bg-violet-50/40",
              )}
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                {editMode && (
                  <button
                    type="button"
                    onClick={() => toggleIn(setSelected, chunk.id)}
                    disabled={isDeleted || busy}
                    className="text-violet-500 disabled:opacity-40"
                    title="Select for merge"
                  >
                    {isSelected ? (
                      <CheckSquare className="size-4" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                )}
                <span className="font-mono">#{chunk.chunkIndex}</span>
                {chunk.pageNumber != null && (
                  <span className="rounded bg-gray-100 px-2 py-0.5">
                    page {chunk.pageNumber}
                  </span>
                )}
                <span>{chunk.charCount} chars</span>
                {imageUrls.length > 0 && (
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                    {imageUrls.length} image{imageUrls.length === 1 ? "" : "s"}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1">
                  {chunk.contentTypes?.length > 0 &&
                    chunk.contentTypes.map((ct) => (
                      <span
                        key={ct}
                        className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700"
                      >
                        {ct}
                      </span>
                    ))}
                  {editMode &&
                    (isDeleted ? (
                      <button
                        type="button"
                        onClick={() => toggleIn(setDeleted, chunk.id)}
                        disabled={busy}
                        className="flex items-center gap-1 px-1.5 text-emerald-600 hover:text-emerald-700"
                      >
                        <Undo2 className="size-3.5" /> Undo
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleIn(setSplitting, chunk.id)}
                          disabled={busy}
                          className={cn(
                            "flex items-center gap-1 px-1.5 hover:text-violet-700",
                            isSplitting ? "text-violet-700" : "text-gray-400",
                          )}
                          title="Split this chunk"
                        >
                          <Scissors className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleIn(setDeleted, chunk.id)}
                          disabled={busy}
                          className="flex items-center gap-1 px-1.5 text-gray-400 hover:text-red-600"
                          title="Delete this chunk"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    ))}
                </span>
              </div>

              {editMode && !isDeleted ? (
                <>
                  {isSplitting && (
                    <p className="mb-1 text-[11px] text-violet-600">
                      Separate fragments with a line containing only{" "}
                      <code className="font-mono">---</code>
                    </p>
                  )}
                  <textarea
                    value={draftOf(chunk)}
                    onChange={(event) => setDraft(chunk.id, event.target.value)}
                    disabled={busy}
                    rows={Math.min(
                      12,
                      Math.max(3, draftOf(chunk).split("\n").length + 1),
                    )}
                    className="w-full resize-y rounded-lg border border-gray-200 p-3 font-mono text-sm leading-relaxed text-gray-800 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </>
              ) : (
                <p
                  className={cn(
                    "whitespace-pre-wrap text-sm leading-relaxed",
                    isDeleted ? "text-gray-400 line-through" : "text-gray-800",
                  )}
                >
                  {body || <span className="italic text-gray-400">(empty)</span>}
                </p>
              )}

              {!editMode && imageUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {imageUrls.map((src, idx) => (
                    <a
                      key={`${chunk.id}-img-${idx}`}
                      href={buildChunkAssetUrl(src)}
                      target="_blank"
                      rel="noreferrer"
                      className="block size-28 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:border-violet-400"
                    >
                      <img
                        src={buildChunkAssetUrl(src)}
                        alt={`chunk ${chunk.chunkIndex} image ${idx + 1}`}
                        crossOrigin="use-credentials"
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const VISIBILITY_OPTIONS: Array<{
  value: TAccessVisibility;
  label: string;
  description: string;
  icon: typeof Globe;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only you can access this document.",
    icon: Lock,
  },
  {
    value: "tenant",
    label: "Organisation",
    description: "Everyone in your organisation can access it.",
    icon: Globe,
  },
  {
    value: "roles",
    label: "Specific roles / users",
    description: "Restrict access to the roles and users you list.",
    icon: Shield,
  },
];

function MetadataReviewState({
  document,
  datasetName,
  pipeline,
  onSave,
  onCancel,
  isSaving,
  isCancelling,
}: {
  document: TIngestionDocument;
  datasetName: string;
  pipeline: ReturnType<typeof getIngestionPipeline>;
  onSave: (payload: TDocumentMetadataPayload) => void;
  onCancel: () => void;
  isSaving: boolean;
  isCancelling: boolean;
}) {
  const existingMeta = (document.docMetadata ?? {}) as Record<string, unknown>;
  const existingPolicy = (document.accessPolicy ?? {}) as Record<
    string,
    unknown
  >;
  const asString = (value: unknown, fallback = "") =>
    typeof value === "string" ? value : fallback;
  const asList = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  const [title, setTitle] = useState(
    asString(existingMeta.title, document.filename),
  );
  const [description, setDescription] = useState(
    asString(existingMeta.description),
  );
  const [tagsInput, setTagsInput] = useState(asList(existingMeta.tags).join(", "));
  const [visibility, setVisibility] = useState<TAccessVisibility>(
    existingPolicy.visibility === "private" ||
      existingPolicy.visibility === "roles"
      ? existingPolicy.visibility
      : "tenant",
  );
  const [roleIdsInput, setRoleIdsInput] = useState(
    asList(existingPolicy.role_ids).join(", "),
  );
  const [userIdsInput, setUserIdsInput] = useState(
    asList(existingPolicy.user_ids).join(", "),
  );

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const busy = isSaving || isCancelling;

  const submit = (complete: boolean) => {
    onSave({
      metadata: {
        title: title.trim(),
        description: description.trim(),
        tags: parseList(tagsInput),
      },
      access_policy: {
        visibility,
        role_ids: visibility === "roles" ? parseList(roleIdsInput) : [],
        user_ids: visibility === "roles" ? parseList(userIdsInput) : [],
      },
      complete,
    });
  };

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200";

  return (
    <IngestionShell title="Guided Ingestion">
      <Hero
        icon={Tag}
        title={document.filename}
        mode="guided"
        meta={
          <>
            <span className="inline-flex items-center gap-1">
              <Database className="size-3.5 text-gray-400" />
              {datasetName}
            </span>
          </>
        }
        status={<StatusPill label="Metadata · review" tone="violet" pulse />}
        description="Add metadata and choose who can access this document, then complete the ingestion."
      />

      <PipelineStepper steps={pipeline} />

      <MotionStack className="space-y-5">
        <MotionItem>
          <Panel icon={Tag} title="Metadata">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={busy}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={busy}
                  rows={3}
                  className={cn(inputClass, "resize-y")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Tags{" "}
                  <span className="font-normal text-gray-400">
                    (comma separated)
                  </span>
                </label>
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  disabled={busy}
                  placeholder="finance, q3, report"
                  className={inputClass}
                />
              </div>
            </div>
          </Panel>
        </MotionItem>

        <MotionItem>
          <Panel icon={Shield} title="Access">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = visibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      disabled={busy}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-violet-400 bg-violet-50/60 ring-2 ring-violet-100"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mb-1.5 size-4",
                          active ? "text-violet-600" : "text-gray-400",
                        )}
                      />
                      <p className="text-sm font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {visibility === "roles" && (
                <div className="grid gap-3 pt-1 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-600">
                      <Shield className="size-3.5" /> Role IDs
                    </label>
                    <input
                      value={roleIdsInput}
                      onChange={(event) => setRoleIdsInput(event.target.value)}
                      disabled={busy}
                      placeholder="role-a, role-b"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-600">
                      <Users className="size-3.5" /> User IDs
                    </label>
                    <input
                      value={userIdsInput}
                      onChange={(event) => setUserIdsInput(event.target.value)}
                      disabled={busy}
                      placeholder="user-1, user-2"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </MotionItem>
      </MotionStack>

      <ActionBar>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          {isCancelling ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <X className="mr-1.5 size-4" />
          )}
          Cancel
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => submit(false)}
          disabled={busy}
        >
          {isSaving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-4" />
          )}
          Save draft
        </Button>
        <Button size="sm" onClick={() => submit(true)} disabled={busy}>
          {isSaving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1.5 size-4" />
          )}
          Complete document
        </Button>
      </ActionBar>
    </IngestionShell>
  );
}

function CancelledState({
  document,
  datasetName,
  onNavigate,
}: {
  document: TIngestionDocument;
  datasetName: string;
  onNavigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <IngestionShell title="Ingestion Cancelled" center>
      <CenteredCard>
        <StatusIcon icon={X} tone="gray" />
        <h2 className="mb-2 text-lg font-bold text-gray-900">
          Ingestion cancelled
        </h2>
        <p className="mb-1 text-sm text-gray-500">{document.filename}</p>
        <p className="mb-6 text-xs text-gray-500">{datasetName}</p>
        <Button onClick={() => onNavigate("/ingestions/new")}>
          Start new ingestion
        </Button>
      </CenteredCard>
    </IngestionShell>
  );
}

function LoadingState() {
  return (
    <IngestionShell title="Ingestion Status" center>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Loading ingestion status…
      </div>
    </IngestionShell>
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
    <IngestionShell title="Ingestion Status" center>
      <CenteredCard>
        <StatusIcon icon={Upload} tone="gray" />
        <h2 className="mb-2 text-lg font-bold text-gray-900">
          No active ingestion
        </h2>
        <p className="mb-6 text-sm text-gray-500">{message}</p>
        <Button onClick={() => onNavigate("/ingestions/new")}>
          Start new ingestion
        </Button>
      </CenteredCard>
    </IngestionShell>
  );
}

function downloadLogs(filename: string, logs: TIngestionLog[]) {
  if (logs.length === 0) {
    return;
  }

  const content = logs
    .map(
      (log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`,
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
