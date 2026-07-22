import { useMemo, useState } from "react";
import {
  type TIngestionDocument,
  isAwaitingApproval,
  isMetadataReview,
} from "@/core/ingestions";
import { useDocumentRoster } from "../use-document-roster";
import { splitRosterByState, type RosterBuckets } from "../roster-buckets";

export type ReviewQueueBuckets = RosterBuckets;

export function needsReview(document: TIngestionDocument): boolean {
  return isAwaitingApproval(document) || isMetadataReview(document);
}

/**
 * Picks which document in a batch the reviewer should be looking at.
 *
 * Selection is deliberately sticky: the queue never yanks the current document
 * out from under someone mid-review just because another one started waiting.
 * It advances only when the current document stops needing a decision, or when
 * the reviewer skips it.
 */
export function useReviewQueue({
  documentIds,
  datasetId,
}: {
  documentIds: string[];
  datasetId: string;
}) {
  const roster = useDocumentRoster({ documentIds, datasetId });
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());

  const buckets = useMemo(
    () =>
      splitRosterByState(
        roster.trackedIds,
        roster.documents,
        roster.deletedIds,
      ),
    [roster.trackedIds, roster.documents, roster.deletedIds],
  );

  // Pick the next document to review, preferring ones the reviewer has not
  // skipped. When only skipped ones remain, offer them again rather than
  // claiming the queue is empty.
  const nextId = useMemo(() => {
    const unskipped = buckets.awaiting.find((doc) => !skipped.has(doc.id));
    return unskipped?.id ?? buckets.awaiting[0]?.id ?? null;
  }, [buckets.awaiting, skipped]);

  const currentStillWaiting =
    currentId !== null &&
    buckets.awaiting.some((document) => document.id === currentId);

  // Adjust during render rather than in an effect so the selection lands in the
  // same commit as the status change that caused it.
  if (!currentStillWaiting && currentId !== nextId) {
    setCurrentId(nextId);
  }

  const activeId = currentStillWaiting ? currentId : nextId;

  const skipCurrent = () => {
    if (!activeId) return;
    setSkipped((prev) => new Set(prev).add(activeId));
    setCurrentId(null);
  };

  const jumpTo = (documentId: string) => {
    setSkipped((prev) => {
      if (!prev.has(documentId)) return prev;
      const next = new Set(prev);
      next.delete(documentId);
      return next;
    });
    setCurrentId(documentId);
  };

  return {
    documents: roster.documents,
    buckets,
    activeId,
    isConnected: roster.isConnected,
    streamError: roster.streamError,
    skippedIds: skipped,
    applyDocument: roster.applyDocument,
    skipCurrent,
    jumpTo,
    total: roster.trackedIds.length,
    /** Documents that no longer need a decision from this reviewer. */
    reviewedCount:
      buckets.completed.length +
      buckets.failed.length +
      buckets.processing.length,
    isQueueEmpty: buckets.awaiting.length === 0,
    isAllSettled:
      buckets.awaiting.length === 0 &&
      buckets.processing.length === 0 &&
      buckets.unknownIds.length === 0,
  };
}
