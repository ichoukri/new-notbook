import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IngestionShell } from "@/components/ingestion/ui";
import { cn } from "@/lib/utils";
import { loadIngestionBatch } from "@/core/batches";
import {
  type TIngestionDocument,
  getAwaitingApprovalStage,
  getIngestionPipeline,
  getRevertStage,
  isMetadataReview,
} from "@/core/ingestions";
import {
  AwaitingApprovalState,
  MetadataReviewState,
} from "../status/guided";
import { MissingState } from "../status/status-states";
import { useIngestionStatusActions } from "../status/use-ingestion-status-actions";
import { useIngestionStatusData } from "../status/use-ingestion-status-data";
import { ReviewQueueBar } from "./queue-bar";
import { useReviewQueue } from "./use-review-queue";

export default function IngestionReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get("batch")?.trim() ?? "";
  const datasetId = searchParams.get("dataset_id")?.trim() ?? "";

  const batch = useMemo(() => loadIngestionBatch(batchId), [batchId]);
  const documentIds = useMemo(() => batch?.documentIds ?? [], [batch]);

  if (!batch) {
    return (
      <MissingState
        message={
          batchId
            ? "This review batch is no longer available in this tab. Open the documents list to pick up where you left off."
            : "Missing batch identifier. Start a guided ingestion to build a review queue."
        }
        onNavigate={navigate}
      />
    );
  }

  return (
    <ReviewQueue
      documentIds={documentIds}
      datasetId={datasetId || batch.datasetId}
      onExit={() => navigate("/documents")}
    />
  );
}

function ReviewQueue({
  documentIds,
  datasetId,
  onExit,
}: {
  documentIds: string[];
  datasetId: string;
  onExit: () => void;
}) {
  const navigate = useNavigate();
  const queue = useReviewQueue({ documentIds, datasetId });

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
  } = useIngestionStatusData({
    documentId: queue.activeId ?? "",
    requestedDatasetId: datasetId,
  });

  // Mutations return the updated document; push it into the queue so the roster
  // and the "next document" choice update without waiting for the stream.
  const setDocumentAndSync: Dispatch<
    SetStateAction<TIngestionDocument | null>
  > = (action) => {
    setDocument(action);
    if (typeof action !== "function" && action) {
      queue.applyDocument(action);
    }
  };

  const actions = useIngestionStatusActions({
    document,
    effectiveDatasetId,
    setDocument: setDocumentAndSync,
    setChunks,
    reloadChunks,
    setPartitionOutput,
  });

  const position = queue.activeId
    ? queue.buckets.awaiting.findIndex((doc) => doc.id === queue.activeId) + 1
    : null;

  const banner = (
    <ReviewQueueBar
      buckets={queue.buckets}
      total={queue.total}
      position={position && position > 0 ? position : null}
      activeId={queue.activeId}
      skippedIds={queue.skippedIds}
      streamError={queue.streamError}
      onSkip={queue.skipCurrent}
      onJumpTo={queue.jumpTo}
      onExit={onExit}
    />
  );

  if (queue.isQueueEmpty || !queue.activeId) {
    return (
      <IngestionShell title="Guided Ingestion" banner={banner} center>
        {queue.isAllSettled ? (
          <BatchFinishedCard
            completed={queue.buckets.completed.length}
            failed={queue.buckets.failed.length}
            onViewDocuments={() => navigate("/documents")}
          />
        ) : (
          <WaitingCard
            inFlight={
              queue.buckets.processing.length + queue.buckets.unknownIds.length
            }
          />
        )}
      </IngestionShell>
    );
  }

  if (isLoading || !document) {
    return (
      <IngestionShell title="Guided Ingestion" banner={banner} center>
        <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
          <Loader2 className="size-6 animate-spin text-violet-500" />
          {pageError || "Loading the next document for review…"}
        </div>
      </IngestionShell>
    );
  }

  const pipeline = getIngestionPipeline(document);
  const datasetName = dataset?.name ?? "Unknown Dataset";

  // Non-null when this pause can step back to the previous review.
  const revertStage = getRevertStage(document);
  const onRevert = revertStage
    ? () => void actions.handleRevert()
    : undefined;

  if (isMetadataReview(document)) {
    return (
      <MetadataReviewState
        banner={banner}
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
        banner={banner}
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

  // The document moved on between the queue picking it and the detail load —
  // the queue will select the next one on the following tick.
  return (
    <IngestionShell title="Guided Ingestion" banner={banner} center>
      <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
        <Loader2 className="size-6 animate-spin text-violet-500" />
        Moving to the next document…
      </div>
    </IngestionShell>
  );
}

function WaitingCard({ inFlight }: { inFlight: number }) {
  return (
    <div className="max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50">
        <Loader2 className="size-6 animate-spin text-indigo-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">
        Nothing to review yet
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        {inFlight} document{inFlight === 1 ? " is" : "s are"} still working
        through the pipeline. This page will bring up the next one the moment it
        needs a decision.
      </p>
    </div>
  );
}

function BatchFinishedCard({
  completed,
  failed,
  onViewDocuments,
}: {
  completed: number;
  failed: number;
  onViewDocuments: () => void;
}) {
  return (
    <div className="max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center">
      <div
        className={cn(
          "mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl",
          failed > 0 ? "bg-amber-50" : "bg-emerald-50",
        )}
      >
        {failed > 0 ? (
          <AlertCircle className="size-6 text-amber-600" />
        ) : (
          <CheckCircle2 className="size-6 text-emerald-600" />
        )}
      </div>
      <h2 className="text-lg font-semibold text-gray-900">
        {failed > 0 ? "Review finished with failures" : "Batch reviewed"}
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        {completed} document{completed === 1 ? "" : "s"} completed
        {failed > 0 && ` · ${failed} failed`}. Nothing is waiting on you.
      </p>
      <Button className="mt-5" onClick={onViewDocuments}>
        <ClipboardList className="mr-1.5 size-4" />
        View documents
        <ArrowRight className="ml-1.5 size-4" />
      </Button>
    </div>
  );
}
