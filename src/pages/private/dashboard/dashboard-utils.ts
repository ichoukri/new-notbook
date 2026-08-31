import type { TDataset } from "@/core/datasets";
import type { TBackendDocumentStats } from "@/core/ingestions";

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

/**
 * Adapt the server's exact counters to the shape the dashboard renders.
 *
 * These used to be summed in the browser over a 100-document page, which made
 * every figure silently cap at 100 — and cost a megabyte of payload to do it.
 */
export function getDashboardMetrics(
  stats: TBackendDocumentStats | null,
): DashboardMetrics {
  return {
    totalDatasets: stats?.total_datasets ?? 0,
    totalDocuments: stats?.total_documents ?? 0,
    totalFileBytes: stats?.total_file_bytes ?? 0,
    chunkCount: stats?.chunk_count ?? 0,
    completedCount: stats?.completed_count ?? 0,
    failedCount: stats?.failed_count ?? 0,
    awaitingApprovalCount: stats?.awaiting_approval_count ?? 0,
    runningCount: stats?.running_count ?? 0,
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
