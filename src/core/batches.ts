import { z } from "zod";

/**
 * A batch is the set of documents created by one "Start ingestion" click.
 *
 * The backend has no batch entity, so this is a client-side grouping kept in
 * sessionStorage: the URL carries only the batch id, which keeps it short for
 * large folder drops and lets a reload recover the roster. Batches are
 * intentionally per-tab and non-durable — they are a view over documents that
 * exist independently, not a record of their own.
 */

const STORAGE_PREFIX = "fusion-rag:ingestion-batch:";

export const INGESTION_BATCH_MODES = ["auto", "guided"] as const;
export type TIngestionBatchMode = (typeof INGESTION_BATCH_MODES)[number];

const batchSchema = z.object({
  id: z.string().min(1),
  datasetId: z.string().min(1),
  mode: z.enum(INGESTION_BATCH_MODES),
  documentIds: z.array(z.string().min(1)).min(1),
  startedAt: z.string().min(1),
});

export type TIngestionBatch = z.infer<typeof batchSchema>;

/**
 * Collapse a roster to unique ids, preserving order.
 *
 * Content-hash deduplication means two different files can finalize to the same
 * document. Keeping both would double every count, list the document twice in
 * the roster, and make skipping it ambiguous.
 */
export function dedupeDocumentIds(documentIds: string[]): string[] {
  return Array.from(new Set(documentIds.filter(Boolean)));
}

export function createIngestionBatchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function storageKey(batchId: string): string {
  return `${STORAGE_PREFIX}${batchId}`;
}

/**
 * Persist a batch roster. Returns whether it survived.
 *
 * Storage throws in private browsing modes and when the quota is exhausted.
 * Callers must check the result: navigating to the review queue after a failed
 * write lands the user on a dead "batch not available" page, which is worse
 * than not navigating at all.
 */
export function saveIngestionBatch(batch: TIngestionBatch): boolean {
  try {
    sessionStorage.setItem(storageKey(batch.id), JSON.stringify(batch));
    // Read back rather than trusting the write: some browsers accept setItem in
    // private mode and silently discard it.
    return loadIngestionBatch(batch.id) !== null;
  } catch {
    return false;
  }
}

export function loadIngestionBatch(
  batchId: string | null | undefined,
): TIngestionBatch | null {
  if (!batchId) return null;

  try {
    const raw = sessionStorage.getItem(storageKey(batchId));
    if (!raw) return null;
    const parsed = batchSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearIngestionBatch(batchId: string): void {
  try {
    sessionStorage.removeItem(storageKey(batchId));
  } catch {
    // Ignore.
  }
}

function buildBatchUrl(
  path: string,
  batch: { id: string; datasetId: string },
): string {
  const params = new URLSearchParams({
    batch: batch.id,
    dataset_id: batch.datasetId,
  });
  return `${path}?${params.toString()}`;
}

export function buildIngestionReviewUrl(batch: {
  id: string;
  datasetId: string;
}): string {
  return buildBatchUrl("/ingestions/review", batch);
}

export function buildIngestionBatchUrl(batch: {
  id: string;
  datasetId: string;
}): string {
  return buildBatchUrl("/ingestions/batch", batch);
}
