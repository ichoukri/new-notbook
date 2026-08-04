import type { TDatasetDocument } from "@/core/datasets";
import {
  type DatasetDocumentFilter,
  type DatasetDocumentGroup,
  type DatasetDocumentSort,
  DOCUMENT_GROUP_ORDER,
} from "./dataset-detail-types";

const COMPLETED_STATUSES = new Set(["completed", "complete", "indexed"]);
const FAILED_STATUSES = new Set(["failed", "error"]);
const PENDING_STATUSES = new Set(["pending", "queued", "cancelled"]);

/** Rank used when sorting by status: worst-first so problems surface. */
const STATUS_RANK: Record<DatasetDocumentGroup, number> = {
  failed: 0,
  awaiting: 1,
  processing: 2,
  pending: 3,
  completed: 4,
};

export function getDocumentGroup(status: string): DatasetDocumentGroup {
  const normalized = status.trim().toLowerCase();

  if (COMPLETED_STATUSES.has(normalized)) return "completed";
  if (FAILED_STATUSES.has(normalized)) return "failed";
  if (normalized.endsWith("_awaiting_approval")) return "awaiting";
  if (PENDING_STATUSES.has(normalized)) return "pending";

  return "processing";
}

export type DatasetDocumentStats = {
  total: number;
  totalSize: number;
  /** Share of documents that finished indexing, 0-100. */
  completionRate: number;
} & Record<DatasetDocumentGroup, number>;

export function getDatasetDocumentStats(
  documents: TDatasetDocument[],
): DatasetDocumentStats {
  const stats: DatasetDocumentStats = {
    total: documents.length,
    totalSize: 0,
    completionRate: 0,
    completed: 0,
    processing: 0,
    awaiting: 0,
    pending: 0,
    failed: 0,
  };

  for (const document of documents) {
    stats[getDocumentGroup(document.processingStatus)] += 1;
    stats.totalSize += Number.isFinite(document.fileSize)
      ? document.fileSize
      : 0;
  }

  stats.completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return stats;
}

export type DatasetDocumentCounts = Record<DatasetDocumentFilter, number>;

export function getDatasetDocumentCounts(
  documents: TDatasetDocument[],
): DatasetDocumentCounts {
  const stats = getDatasetDocumentStats(documents);

  return {
    all: stats.total,
    completed: stats.completed,
    processing: stats.processing,
    awaiting: stats.awaiting,
    pending: stats.pending,
    failed: stats.failed,
  };
}

export function filterDatasetDocuments(
  documents: TDatasetDocument[],
  options: { query: string; filter: DatasetDocumentFilter },
): TDatasetDocument[] {
  const query = options.query.trim().toLowerCase();

  return documents.filter((document) => {
    if (
      options.filter !== "all" &&
      getDocumentGroup(document.processingStatus) !== options.filter
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    return (
      document.filename.toLowerCase().includes(query) ||
      document.fileType.toLowerCase().includes(query) ||
      (document.sourceUrl ?? "").toLowerCase().includes(query) ||
      document.sourceRelativePaths.some((path) =>
        path.toLowerCase().includes(query),
      )
    );
  });
}

function getTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function sortDatasetDocuments(
  documents: TDatasetDocument[],
  sort: DatasetDocumentSort,
): TDatasetDocument[] {
  const factor = sort.direction === "asc" ? 1 : -1;

  return [...documents].sort((left, right) => {
    switch (sort.key) {
      case "name":
        return (
          factor *
          left.filename.localeCompare(right.filename, undefined, {
            sensitivity: "base",
          })
        );
      case "size":
        return factor * (left.fileSize - right.fileSize);
      case "status":
        return (
          factor *
          (STATUS_RANK[getDocumentGroup(left.processingStatus)] -
            STATUS_RANK[getDocumentGroup(right.processingStatus)])
        );
      case "added":
      default:
        return factor * (getTime(left.createdAt) - getTime(right.createdAt));
    }
  });
}

/** True while at least one document is still moving through the pipeline. */
export function hasProcessingDocuments(
  documents: TDatasetDocument[],
): boolean {
  return documents.some((document) => {
    const group = getDocumentGroup(document.processingStatus);
    return group === "processing" || group === "pending";
  });
}

export type DatasetPipelineSegment = {
  group: DatasetDocumentGroup;
  count: number;
  percentage: number;
};

/** Non-empty groups as bar segments, widths summing to 100. */
export function getPipelineSegments(
  stats: DatasetDocumentStats,
): DatasetPipelineSegment[] {
  if (stats.total === 0) {
    return [];
  }

  return DOCUMENT_GROUP_ORDER.filter((group) => stats[group] > 0).map(
    (group) => ({
      group,
      count: stats[group],
      percentage: (stats[group] / stats.total) * 100,
    }),
  );
}

export function getDocumentSourceLabel(document: TDatasetDocument): string {
  return (
    document.sourceRelativePaths[0] || document.sourceUrl || "Uploaded file"
  );
}
