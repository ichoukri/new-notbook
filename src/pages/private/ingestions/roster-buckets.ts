import {
  type TIngestionDocument,
  isAwaitingApproval,
  isMetadataReview,
} from "@/core/ingestions";

export type RosterBuckets = {
  /** Paused and waiting for a human decision. */
  awaiting: TIngestionDocument[];
  /** Still moving through the pipeline on its own. */
  processing: TIngestionDocument[];
  completed: TIngestionDocument[];
  failed: TIngestionDocument[];
  /** Deleted while the batch was open — gone, but not unaccounted for. */
  deletedIds: string[];
  /** Tracked ids the stream has not reported on yet. */
  unknownIds: string[];
};

function isFinished(document: TIngestionDocument): boolean {
  return (
    document.processingStatus === "completed" ||
    document.processingStatus === "cancelled"
  );
}

function isFailed(document: TIngestionDocument): boolean {
  return document.processingStatus === "failed";
}

/**
 * Sort a tracked roster into the states a batch view cares about.
 *
 * Ids the stream has not reported on stay in `unknownIds` rather than being
 * folded into any bucket — treating silence as "done" would let a batch claim
 * it finished while documents were still unaccounted for.
 */
export function splitRosterByState(
  trackedIds: string[],
  documents: Map<string, TIngestionDocument>,
  deleted: Set<string> = new Set(),
): RosterBuckets {
  const awaiting: TIngestionDocument[] = [];
  const processing: TIngestionDocument[] = [];
  const completed: TIngestionDocument[] = [];
  const failed: TIngestionDocument[] = [];
  const deletedIds: string[] = [];
  const unknownIds: string[] = [];

  for (const id of trackedIds) {
    // Checked before the lookup: a deletion removes the document, and without
    // this it would fall through to "unreported" and keep the batch waiting on
    // something that no longer exists.
    if (deleted.has(id)) {
      deletedIds.push(id);
      continue;
    }
    const document = documents.get(id);
    if (!document) {
      unknownIds.push(id);
      continue;
    }
    if (isAwaitingApproval(document) || isMetadataReview(document)) {
      awaiting.push(document);
    } else if (isFailed(document)) {
      failed.push(document);
    } else if (isFinished(document)) {
      completed.push(document);
    } else {
      processing.push(document);
    }
  }

  return { awaiting, processing, completed, failed, deletedIds, unknownIds };
}
