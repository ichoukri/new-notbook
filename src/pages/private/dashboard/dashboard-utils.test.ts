import { describe, expect, it } from "vitest";
import type { TDataset } from "@/core/datasets";
import type { TIngestionDocument } from "@/core/ingestions";
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

const document = (
  overrides: Partial<TIngestionDocument>,
): TIngestionDocument => ({
  id: "doc",
  hash: "hash",
  filename: "file.pdf",
  fileSize: 100,
  fileType: "pdf",
  sourceUrl: null,
  sourceRelativePaths: [],
  userId: "user-1",
  tenantId: "tenant-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  taskId: null,
  datasetIds: [],
  processingStatus: "completed",
  mode: "auto",
  processingDetails: null,
  docMetadata: null,
  accessPolicy: null,
  ...overrides,
});

describe("dashboard helpers", () => {
  it("summarizes dashboard metrics", () => {
    const metrics = getDashboardMetrics({
      datasets: [dataset({ id: "dataset-1" })],
      documents: [
        document({
          id: "doc-1",
          processingDetails: { chunking: { total_chunks: 3 } },
        }),
        document({
          id: "doc-2",
          processingStatus: "failed",
          fileSize: 50,
        }),
        document({
          id: "doc-3",
          processingStatus: "metadata_awaiting_approval",
          fileSize: 25,
        }),
      ],
      datasetTotal: 0,
      documentTotal: 0,
    });

    expect(metrics).toMatchObject({
      totalDatasets: 1,
      totalDocuments: 3,
      totalFileBytes: 175,
      chunkCount: 3,
      completedCount: 1,
      failedCount: 1,
      awaitingApprovalCount: 1,
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
