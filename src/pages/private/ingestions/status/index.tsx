import { useNavigate, useSearchParams } from "react-router";
import { useState } from "react";
import {
  getAwaitingApprovalStage,
  getIngestionError,
  getIngestionErrorTraceback,
  getIngestionFailedStage,
  getIngestionLogs,
  getIngestionPipeline,
  getRevertStage,
  isLiveInPipeline,
  isMetadataReview,
} from "@/core/ingestions";
import { AwaitingApprovalState, MetadataReviewState } from "./guided";
import { CancelIngestionDialog } from "./cancel-ingestion-dialog";
import { PipelineStatusView } from "./pipeline-status-view";
import { ErrorState, LoadingState, MissingState } from "./status-states";
import { useIngestionStatusActions } from "./use-ingestion-status-actions";
import { useIngestionStatusData } from "./use-ingestion-status-data";

export default function IngestionStatusPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCancel, setShowCancel] = useState(false);
  const documentId = searchParams.get("document_id")?.trim() ?? "";
  const requestedDatasetId = searchParams.get("dataset_id")?.trim() ?? "";

  const {
    document,
    setDocument,
    dataset,
    chunks,
    setChunks,
    reloadChunks,
    isLoading,
    isLoadingChunks,
    pageError,
    partitionOutput,
    setPartitionOutput,
    effectiveDatasetId,
  } = useIngestionStatusData({ documentId, requestedDatasetId });

  const actions = useIngestionStatusActions({
    document,
    effectiveDatasetId,
    setDocument,
    setChunks,
    reloadChunks,
    setPartitionOutput,
  });

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
        onRetry={() => void actions.handleRetry()}
        isRetrying={actions.isRetrying}
      />
    );
  }

  // Non-null when this pause can step back to the previous review.
  const revertStage = getRevertStage(document);
  const onRevert = revertStage
    ? () => void actions.handleRevert()
    : undefined;

  if (isMetadataReview(document)) {
    return (
      <MetadataReviewState
        document={document}
        datasetName={datasetName}
        pipeline={pipeline}
        onSave={(payload) => void actions.handleSaveMetadata(payload)}
        onRevert={onRevert}
        onCancel={() => void actions.handleCancel()}
        isSaving={actions.isSavingMetadata}
        isReverting={actions.isReverting}
        isCancelling={actions.isCancelling}
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
        onApprove={() => void actions.handleApprove()}
        onRevert={onRevert}
        onCancel={() => void actions.handleCancel()}
        onSubmitEdits={(ops) => void actions.handleEditChunks(ops)}
        onSaveRemovals={(indices) => void actions.handleSaveRemovals(indices)}
        isApproving={actions.isApproving}
        isReverting={actions.isReverting}
        isCancelling={actions.isCancelling}
        isEditingChunks={actions.isEditingChunks}
        isSavingRemovals={actions.isSavingRemovals}
      />
    );
  }

  return (
    <>
      <PipelineStatusView
        document={document}
        datasetName={datasetName}
        pipeline={pipeline}
        chunks={chunks}
        isLoadingChunks={isLoadingChunks}
        pageError={pageError}
        // Only offered while there is work to stop; a finished or already
        // cancelled document has nothing to revoke.
        onCancel={
          isLiveInPipeline(document.processingStatus)
            ? () => setShowCancel(true)
            : undefined
        }
        isCancelling={actions.isCancelling}
      />
      <CancelIngestionDialog
        open={showCancel}
        filename={document.filename}
        isCancelling={actions.isCancelling}
        onOpenChange={setShowCancel}
        onConfirm={async () => {
          await actions.handleCancel();
          setShowCancel(false);
        }}
      />
    </>
  );
}
