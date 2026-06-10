import { useState } from "react";
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
}) {
  const stageLabel = STAGE_DISPLAY_NAMES[stage] ?? stage;
  const description =
    STAGE_DESCRIPTIONS[stage] ??
    "Review the output of this stage and approve to continue.";

  const [pendingChunkChanges, setPendingChunkChanges] = useState(0);
  const blockApprove = pendingChunkChanges > 0;

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
          onPendingChange={setPendingChunkChanges}
        />
      )}

      <ActionBar>
        <span className="mr-auto hidden text-xs sm:block">
          {blockApprove ? (
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
              ? "Apply or discard your pending chunk changes first"
              : undefined
          }
        >
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
