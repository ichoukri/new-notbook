import {
  type TIngestionDocument,
  getAwaitingApprovalStage,
  isMetadataReview,
} from "@/core/ingestions";

export type StageTone =
  | "waiting"
  | "running"
  | "done"
  | "failed"
  | "deleted"
  | "unknown";

export type StageDescriptor = {
  label: string;
  tone: StageTone;
};

const RUNNING_LABELS: Record<string, string> = {
  pending: "Queued",
  queued: "Queued",
  partitioning: "Extracting",
  chunking: "Chunking",
  summarising: "Summarising",
  graph_extraction: "Building graph",
  vectorization: "Embedding",
};

const AWAITING_LABELS: Record<string, string> = {
  partition: "Extraction review",
  chunking: "Chunk review",
  summarising: "Summary review",
  graph: "Graph review",
  vectorization: "Vector review",
};

/**
 * A short, human stage label for one document in a batch listing.
 *
 * The batch view shows many documents at once, so this deliberately collapses
 * the full pipeline into a single phrase — the detailed stepper lives on the
 * per-document status page.
 */
export function describeStage(
  document: TIngestionDocument | undefined,
  { isDeleted = false }: { isDeleted?: boolean } = {},
): StageDescriptor {
  // Checked before the missing-document case: a deletion removes the document,
  // so without this it would read as "waiting for status" forever.
  if (isDeleted) return { label: "Deleted", tone: "deleted" };
  if (!document) return { label: "Waiting for status", tone: "unknown" };

  const status = document.processingStatus;

  if (status === "completed") return { label: "Completed", tone: "done" };
  if (status === "failed") return { label: "Failed", tone: "failed" };
  if (status === "cancelled") return { label: "Cancelled", tone: "failed" };

  if (isMetadataReview(document)) {
    return { label: "Metadata review", tone: "waiting" };
  }

  const awaitingStage = getAwaitingApprovalStage(document);
  if (awaitingStage) {
    return {
      label: AWAITING_LABELS[awaitingStage] ?? "Awaiting review",
      tone: "waiting",
    };
  }

  return { label: RUNNING_LABELS[status] ?? "Processing", tone: "running" };
}

export const STAGE_TONE_CLASSES: Record<StageTone, string> = {
  waiting: "bg-violet-50 text-violet-700",
  running: "bg-indigo-50 text-indigo-600",
  done: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-600",
  deleted: "bg-gray-100 text-gray-400 line-through",
  unknown: "bg-gray-100 text-gray-500",
};

/**
 * Ordered tones for the batch-level funnel. Every state a tracked document can
 * be in appears here — otherwise the counts would not add up to the batch total
 * and a document could vanish from the summary without explanation.
 */
export const FUNNEL_TONES: StageTone[] = [
  "running",
  "waiting",
  "done",
  "failed",
  "deleted",
  "unknown",
];

export const TONE_LABELS: Record<StageTone, string> = {
  running: "processing",
  waiting: "needs review",
  done: "completed",
  failed: "failed",
  deleted: "deleted",
  unknown: "unreported",
};
