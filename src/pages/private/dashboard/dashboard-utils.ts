import type { TDataset } from "@/core/datasets";
import { getDocumentChunkCount } from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";
import {
  isDocumentActivelyProcessing,
  isDocumentAwaitingReview,
} from "@/core/documents";

export type DashboardMetrics = {
  totalDatasets: number;
  totalDocuments: number;
  totalFileBytes: number;
  chunkCount: number;
  completedCount: number;
  failedCount: number;
  awaitingApprovalCount: number;
  runningCount: number;
};

export function formatDashboardNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function getDatasetDocumentCount(dataset: TDataset): number {
  return dataset.documentCount || dataset.documents.length;
}

export function getDashboardMetrics({
  datasets,
  documents,
  datasetTotal,
  documentTotal,
}: {
  datasets: TDataset[];
  documents: TIngestionDocument[];
  datasetTotal: number;
  documentTotal: number;
}): DashboardMetrics {
  return {
    totalDatasets: datasetTotal || datasets.length,
    totalDocuments: documentTotal || documents.length,
    totalFileBytes: documents.reduce(
      (sum, document) => sum + document.fileSize,
      0,
    ),
    chunkCount: documents.reduce(
      (sum, document) => sum + getDocumentChunkCount(document),
      0,
    ),
    completedCount: documents.filter(
      (document) => document.processingStatus === "completed",
    ).length,
    failedCount: documents.filter(
      (document) => document.processingStatus === "failed",
    ).length,
    awaitingApprovalCount: documents.filter(isDocumentAwaitingReview).length,
    runningCount: documents.filter(isDocumentActivelyProcessing).length,
  };
}

export function getTopDatasets(
  datasets: TDataset[],
  limit = 4,
): TDataset[] {
  return [...datasets]
    .sort((left, right) => {
      const documentDelta =
        getDatasetDocumentCount(right) - getDatasetDocumentCount(left);
      if (documentDelta !== 0) return documentDelta;
      return (
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime()
      );
    })
    .slice(0, limit);
}
