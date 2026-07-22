import { useState, type ReactNode } from "react";
import { CheckCircle2, Database, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ActionBar,
  Hero,
  IngestionShell,
  PipelineStepper,
  StatusPill,
} from "@/components/ingestion/ui";
import type {
  TChunkEditOperation,
  TIngestionChunk,
  TIngestionDocument,
  TIngestionPipelineStep,
} from "@/core/ingestions";
import { formatFileSize } from "@/core/datasets";
import { ChunkReview } from "./chunk-review";
import { GraphReview, type TGraphReviewState } from "./graph-review";
import { PartitionReview } from "./partition-review";
import { STAGE_DESCRIPTIONS, STAGE_DISPLAY_NAMES } from "./stage-copy";

export function AwaitingApprovalState({
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
  banner,
}: {
  document: TIngestionDocument;
  datasetName: string;
  pipeline: TIngestionPipelineStep[];
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
  /** Rendered above the content — the batch review queue bar. */
  banner?: ReactNode;
}) {
  const stageLabel = STAGE_DISPLAY_NAMES[stage] ?? stage;
  const description =
    STAGE_DESCRIPTIONS[stage] ??
    "Review the output of this stage and approve to continue.";

  const [pendingChunkChanges, setPendingChunkChanges] = useState(0);
  const [graphReviewState, setGraphReviewState] = useState<TGraphReviewState>({
    pendingCount: null,
    ready: false,
    isLoading: true,
    hasError: false,
  });
  const blockApprove =
    stage === "graph" ? !graphReviewState.ready : pendingChunkChanges > 0;

  return (
    <IngestionShell title="Guided Ingestion" banner={banner}>
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
          documentId={document.id}
          canPreviewSource={(document.fileType ?? "").toLowerCase() === "pdf"}
          onSubmitEdits={onSubmitEdits}
          isSubmitting={isEditingChunks}
          disabled={isApproving || isCancelling}
          onPendingChange={setPendingChunkChanges}
        />
      )}
      {stage === "graph" && (
        <GraphReview
          documentId={document.id}
          disabled={isApproving || isCancelling}
          onStateChange={setGraphReviewState}
        />
      )}

      <ActionBar>
        <span className="mr-auto hidden text-xs sm:block">
          {stage === "graph" ? (
            graphReviewState.hasError ? (
              <span className="text-red-600">
                Resolve the graph review error before publishing.
              </span>
            ) : graphReviewState.pendingCount === null ||
              graphReviewState.isLoading ? (
              <span className="text-gray-400">
                Checking graph review decisions…
              </span>
            ) : graphReviewState.pendingCount > 0 ? (
              <span className="text-amber-700">
                Review {graphReviewState.pendingCount} remaining candidate
                {graphReviewState.pendingCount === 1 ? "" : "s"} before
                publishing.
              </span>
            ) : (
              <span className="text-emerald-700">
                All candidates are reviewed. The approved graph is ready to
                publish.
              </span>
            )
          ) : blockApprove ? (
            <span className="text-violet-600">
              Apply or discard your {pendingChunkChanges} pending change
              {pendingChunkChanges === 1 ? "" : "s"} before approving.
            </span>
          ) : (
            <span className="text-gray-400">
              {stageLabel} stage - approve to continue the pipeline.
            </span>
          )}
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
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isApproving || isCancelling || blockApprove}
          title={
            blockApprove
              ? stage === "graph"
                ? "Review every graph candidate before publishing"
                : "Apply or discard your pending chunk changes first"
              : undefined
          }
        >
          {isApproving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1.5 size-4" />
          )}
          {stage === "graph" ? "Publish graph & continue" : "Approve & continue"}
        </Button>
      </ActionBar>
    </IngestionShell>
  );
}
