import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { backendApi } from "@/core/api";
import { getApiErrorMessage, getApiErrorStatus } from "@/core/api/error";
import {
  type TBackendDocumentMutationResponse,
  type TChunkEditOperation,
  type TDocumentMetadataPayload,
  type TIngestionChunk,
  type TIngestionDocument,
  getAwaitingApprovalStage,
  mapBackendDocument,
} from "@/core/ingestions";

type UseIngestionStatusActionsParams = {
  document: TIngestionDocument | null;
  effectiveDatasetId: string;
  setDocument: Dispatch<SetStateAction<TIngestionDocument | null>>;
  setChunks: Dispatch<SetStateAction<TIngestionChunk[]>>;
  reloadChunks: () => void;
  setPartitionOutput: Dispatch<
    SetStateAction<Record<string, unknown> | null>
  >;
};

export function useIngestionStatusActions({
  document,
  effectiveDatasetId,
  setDocument,
  setChunks,
  reloadChunks,
  setPartitionOutput,
}: UseIngestionStatusActionsParams) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEditingChunks, setIsEditingChunks] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isSavingRemovals, setIsSavingRemovals] = useState(false);

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
      // (e.g. the user clicked retry twice quickly). Surface that as info.
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
      setChunks([]);
      reloadChunks();
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
      toast.success("Ingestion stopped and artifacts cleaned up.");
    } catch (error) {
      // 409 means a stage is holding the document lock. That is a normal race
      // when stopping mid-pipeline, not a failure — the stage finishes in a
      // moment and the retry succeeds.
      if (getApiErrorStatus(error) === 409) {
        toast.info(
          getApiErrorMessage(
            error,
            "A stage is finishing right now — try stopping again in a moment.",
          ),
        );
      } else {
        toast.error(getApiErrorMessage(error, "Could not stop this ingestion."));
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    handleRetry,
    handleApprove,
    handleEditChunks,
    handleSaveRemovals,
    handleSaveMetadata,
    handleCancel,
    isRetrying,
    isApproving,
    isCancelling,
    isEditingChunks,
    isSavingMetadata,
    isSavingRemovals,
  };
}
