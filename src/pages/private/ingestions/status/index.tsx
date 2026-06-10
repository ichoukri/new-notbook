import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { backendApi } from "@/core/api";
import { getApiErrorMessage, getApiErrorStatus } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendChunk,
  type TBackendDocument,
  type TBackendDocumentMutationResponse,
  type TChunkEditOperation,
  type TDocumentMetadataPayload,
  type TIngestionChunk,
  type TIngestionDocument,
  buildDocumentStatusStreamUrl,
  getAwaitingApprovalStage,
  isMetadataReview,
  getIngestionError,
  getIngestionErrorTraceback,
  getIngestionFailedStage,
  getIngestionLogs,
  getIngestionPipeline,
  mapBackendChunk,
  mapBackendDocument,
} from "@/core/ingestions";
import { AwaitingApprovalState, MetadataReviewState } from "./guided";
import { PipelineStatusView } from "./pipeline-status-view";
import { ErrorState, LoadingState, MissingState } from "./status-states";

export default function IngestionStatusPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("document_id")?.trim() ?? "";
  const requestedDatasetId = searchParams.get("dataset_id")?.trim() ?? "";

  const [document, setDocument] = useState<TIngestionDocument | null>(null);
  const [dataset, setDataset] = useState<TDataset | null>(null);
  const [chunks, setChunks] = useState<TIngestionChunk[]>([]);
  // Bumped to force a chunk refetch after an edit/apply, even when the
  // document's id/status/updatedAt don't change (e.g. a merge that leaves the
  // doc paused at the same awaiting-approval stage).
  const [chunksReloadKey, setChunksReloadKey] = useState(0);
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
  }, [
    document?.id,
    document?.processingStatus,
    document?.updatedAt,
    chunksReloadKey,
  ]);

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
      // Force the chunk-loading effect to refetch the rebuilt version. The
      // reload key guarantees the effect re-runs even if the document's
      // id/status/updatedAt are unchanged by the edit.
      setChunks([]);
      setChunksReloadKey((key) => key + 1);
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
  const logs = getIngestionLogs(document);
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

  // Completed and cancelled documents fall through to the full pipeline +
  // Live-logs view below, so re-opening a finished file re-streams its
  // existing process and logs rather than showing a bare summary card.

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
    <PipelineStatusView
      document={document}
      datasetName={datasetName}
      pipeline={pipeline}
      chunks={chunks}
      isLoadingChunks={isLoadingChunks}
      pageError={pageError}
    />
  );
}
