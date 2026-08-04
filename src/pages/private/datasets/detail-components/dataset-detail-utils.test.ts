import { describe, expect, it } from "vitest";
import type { TDatasetDocument } from "@/core/datasets";
import {
  filterDatasetDocuments,
  getDatasetDocumentStats,
  getDocumentGroup,
  getPipelineSegments,
  hasProcessingDocuments,
  sortDatasetDocuments,
} from "./dataset-detail-utils";

function makeDocument(
  overrides: Partial<TDatasetDocument> & { id: string },
): TDatasetDocument {
  return {
    filename: "file.pdf",
    fileSize: 1024,
    fileType: "pdf",
    sourceUrl: null,
    sourceRelativePaths: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    processingStatus: "completed",
    ...overrides,
  };
}

const documents: TDatasetDocument[] = [
  makeDocument({
    id: "doc-1",
    filename: "handbook.pdf",
    fileSize: 4096,
    processingStatus: "completed",
    createdAt: "2026-01-03T00:00:00.000Z",
  }),
  makeDocument({
    id: "doc-2",
    filename: "contract.docx",
    fileType: "docx",
    fileSize: 2048,
    processingStatus: "chunking",
    createdAt: "2026-01-02T00:00:00.000Z",
  }),
  makeDocument({
    id: "doc-3",
    filename: "notes.txt",
    fileType: "txt",
    fileSize: 128,
    processingStatus: "failed",
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceRelativePaths: ["archive/notes.txt"],
  }),
  makeDocument({
    id: "doc-4",
    filename: "policy.pdf",
    fileSize: 512,
    processingStatus: "graph_extraction_awaiting_approval",
    createdAt: "2026-01-04T00:00:00.000Z",
  }),
];

describe("getDocumentGroup", () => {
  it("maps fine-grained ingestion statuses onto actionable groups", () => {
    expect(getDocumentGroup("completed")).toBe("completed");
    expect(getDocumentGroup("indexed")).toBe("completed");
    expect(getDocumentGroup("failed")).toBe("failed");
    expect(getDocumentGroup("queued")).toBe("pending");
    expect(getDocumentGroup("chunking_awaiting_approval")).toBe("awaiting");
    expect(getDocumentGroup("vectorization")).toBe("processing");
  });

  it("treats unknown statuses as in-flight rather than dropping them", () => {
    expect(getDocumentGroup("some_new_stage")).toBe("processing");
  });
});

describe("getDatasetDocumentStats", () => {
  it("counts each group, total size and completion rate", () => {
    const stats = getDatasetDocumentStats(documents);

    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(1);
    expect(stats.processing).toBe(1);
    expect(stats.awaiting).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.totalSize).toBe(6784);
    expect(stats.completionRate).toBe(25);
  });

  it("reports a zeroed completion rate for an empty dataset", () => {
    expect(getDatasetDocumentStats([]).completionRate).toBe(0);
  });
});

describe("filterDatasetDocuments", () => {
  it("filters by group", () => {
    expect(
      filterDatasetDocuments(documents, { query: "", filter: "failed" }),
    ).toEqual([documents[2]]);
  });

  it("searches filename, type and source path", () => {
    expect(
      filterDatasetDocuments(documents, { query: "handbook", filter: "all" }),
    ).toHaveLength(1);
    expect(
      filterDatasetDocuments(documents, { query: "docx", filter: "all" }),
    ).toHaveLength(1);
    expect(
      filterDatasetDocuments(documents, { query: "archive/", filter: "all" }),
    ).toEqual([documents[2]]);
  });
});

describe("sortDatasetDocuments", () => {
  it("sorts without mutating the source array", () => {
    const sorted = sortDatasetDocuments(documents, {
      key: "size",
      direction: "asc",
    });

    expect(sorted.map((document) => document.id)).toEqual([
      "doc-3",
      "doc-4",
      "doc-2",
      "doc-1",
    ]);
    expect(documents[0].id).toBe("doc-1");
  });

  it("sorts newest first by default direction", () => {
    expect(
      sortDatasetDocuments(documents, {
        key: "added",
        direction: "desc",
      }).map((document) => document.id),
    ).toEqual(["doc-4", "doc-1", "doc-2", "doc-3"]);
  });

  it("surfaces problem documents first when sorting by status", () => {
    expect(
      sortDatasetDocuments(documents, {
        key: "status",
        direction: "asc",
      }).map((document) => document.id),
    ).toEqual(["doc-3", "doc-4", "doc-2", "doc-1"]);
  });
});

describe("hasProcessingDocuments", () => {
  it("is true while work is in flight and false once settled", () => {
    expect(hasProcessingDocuments(documents)).toBe(true);
    expect(hasProcessingDocuments([documents[0], documents[2]])).toBe(false);
    expect(hasProcessingDocuments([])).toBe(false);
  });
});

describe("getPipelineSegments", () => {
  it("returns only non-empty groups with widths summing to 100", () => {
    const segments = getPipelineSegments(getDatasetDocumentStats(documents));

    expect(segments.map((segment) => segment.group)).toEqual([
      "completed",
      "processing",
      "awaiting",
      "failed",
    ]);
    expect(
      segments.reduce((sum, segment) => sum + segment.percentage, 0),
    ).toBeCloseTo(100);
  });

  it("returns nothing for an empty dataset", () => {
    expect(getPipelineSegments(getDatasetDocumentStats([]))).toEqual([]);
  });
});
