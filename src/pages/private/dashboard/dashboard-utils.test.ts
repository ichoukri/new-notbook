import { describe, expect, it } from "vitest";
import type { TDataset } from "@/core/datasets";
import type { TBackendDocumentStats } from "@/core/ingestions";
import {
  formatDashboardNumber,
  getDashboardMetrics,
  getDatasetDocumentCount,
  getTopDatasets,
} from "./dashboard-utils";

const dataset = (overrides: Partial<TDataset>): TDataset => ({
  id: "dataset",
  name: "Dataset",
  description: "",
  tenantId: "tenant-1",
  createdBy: "user-1",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  tags: [],
  metadata: {},
  documentCount: 0,
  documents: [],
  ...overrides,
});

describe("dashboard helpers", () => {
  it("maps server counters onto the dashboard metrics", () => {
    const stats: TBackendDocumentStats = {
      total_documents: 3,
      total_datasets: 1,
      total_file_bytes: 175,
      chunk_count: 3,
      completed_count: 1,
      failed_count: 1,
      cancelled_count: 0,
      awaiting_approval_count: 1,
      running_count: 0,
    };

    expect(getDashboardMetrics(stats)).toEqual({
      totalDatasets: 1,
      totalDocuments: 3,
      totalFileBytes: 175,
      chunkCount: 3,
      completedCount: 1,
      failedCount: 1,
      awaitingApprovalCount: 1,
      runningCount: 0,
    });
  });

  it("renders zeros while the stats request is still in flight", () => {
    // The dashboard mounts before /documents/stats resolves; every tile must
    // show 0 rather than NaN or undefined.
    expect(getDashboardMetrics(null)).toEqual({
      totalDatasets: 0,
      totalDocuments: 0,
      totalFileBytes: 0,
      chunkCount: 0,
      completedCount: 0,
      failedCount: 0,
      awaitingApprovalCount: 0,
      runningCount: 0,
    });
  });

  it("sorts top datasets by document count and recency", () => {
    const datasets = [
      dataset({ id: "old", documentCount: 2, updatedAt: "2026-01-01T00:00:00.000Z" }),
      dataset({ id: "new", documentCount: 2, updatedAt: "2026-01-02T00:00:00.000Z" }),
      dataset({ id: "large", documentCount: 5 }),
    ];

    expect(getTopDatasets(datasets).map((item) => item.id)).toEqual([
      "large",
      "new",
      "old",
    ]);
    expect(getDatasetDocumentCount(dataset({ documentCount: 0, documents: [{} as never] }))).toBe(1);
    expect(formatDashboardNumber(1200)).toBe("1,200");
  });
});
