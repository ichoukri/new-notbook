import { describe, expect, it } from "vitest";
import type { TIngestionDocument } from "@/core/ingestions";
import { describeStage } from "./stage-labels";

function doc(processingStatus: string): TIngestionDocument {
  return {
    id: "doc-1",
    hash: "a".repeat(64),
    filename: "manual.pdf",
    fileSize: 10,
    fileType: "pdf",
    sourceRelativePaths: [],
    userId: "user-1",
    tenantId: "tenant-1",
    createdAt: "2026-07-21T10:00:00.000Z",
    updatedAt: "2026-07-21T10:00:00.000Z",
    datasetIds: ["dataset-1"],
    processingStatus,
    mode: "auto",
    processingDetails: null,
    docMetadata: null,
    accessPolicy: null,
  };
}

describe("describeStage", () => {
  it("marks an unreported document as unknown rather than done", () => {
    // Silence must never read as success in a batch summary.
    expect(describeStage(undefined)).toEqual({
      label: "Waiting for status",
      tone: "unknown",
    });
  });

  it("labels terminal states", () => {
    expect(describeStage(doc("completed"))).toEqual({
      label: "Completed",
      tone: "done",
    });
    expect(describeStage(doc("failed")).tone).toBe("failed");
    expect(describeStage(doc("cancelled")).tone).toBe("failed");
  });

  it("labels in-flight stages", () => {
    expect(describeStage(doc("queued")).label).toBe("Queued");
    expect(describeStage(doc("partitioning"))).toEqual({
      label: "Extracting",
      tone: "running",
    });
    expect(describeStage(doc("vectorization")).label).toBe("Embedding");
  });

  it("distinguishes every approval gate as waiting on a human", () => {
    const gates: Array<[string, string]> = [
      ["partitioning_awaiting_approval", "Extraction review"],
      ["chunking_awaiting_approval", "Chunk review"],
      ["summarising_awaiting_approval", "Summary review"],
      ["graph_extraction_awaiting_approval", "Graph review"],
      ["vectorization_awaiting_approval", "Vector review"],
      ["metadata_awaiting_approval", "Metadata review"],
    ];

    for (const [status, label] of gates) {
      expect(describeStage(doc(status))).toEqual({ label, tone: "waiting" });
    }
  });

  it("reports a deleted document as deleted, not as waiting", () => {
    // A deletion removes the document, so the undefined case would otherwise
    // read as "waiting for status" forever and hold the batch open.
    expect(describeStage(undefined, { isDeleted: true })).toEqual({
      label: "Deleted",
      tone: "deleted",
    });
  });

  it("prefers deleted over a stale cached document", () => {
    expect(describeStage(doc("chunking"), { isDeleted: true }).tone).toBe(
      "deleted",
    );
  });

  it("falls back to a generic running label for unrecognised statuses", () => {
    expect(describeStage(doc("some_new_stage"))).toEqual({
      label: "Processing",
      tone: "running",
    });
  });
});
