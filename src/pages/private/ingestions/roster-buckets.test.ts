import { describe, expect, it } from "vitest";
import type { TIngestionDocument } from "@/core/ingestions";
import { splitRosterByState } from "./roster-buckets";

function doc(id: string, processingStatus: string): TIngestionDocument {
  return {
    id,
    hash: "a".repeat(64),
    filename: `${id}.pdf`,
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

function rosterOf(...documents: TIngestionDocument[]) {
  return new Map(documents.map((document) => [document.id, document]));
}

describe("splitRosterByState", () => {
  it("sorts documents into the states a batch cares about", () => {
    const buckets = splitRosterByState(
      ["a", "b", "c", "d"],
      rosterOf(
        doc("a", "chunking"),
        doc("b", "chunking_awaiting_approval"),
        doc("c", "completed"),
        doc("d", "failed"),
      ),
    );

    expect(buckets.processing.map((d) => d.id)).toEqual(["a"]);
    expect(buckets.awaiting.map((d) => d.id)).toEqual(["b"]);
    expect(buckets.completed.map((d) => d.id)).toEqual(["c"]);
    expect(buckets.failed.map((d) => d.id)).toEqual(["d"]);
    expect(buckets.unknownIds).toEqual([]);
  });

  it("keeps unreported ids separate rather than counting them as done", () => {
    const buckets = splitRosterByState(["a", "b"], rosterOf(doc("a", "completed")));

    expect(buckets.unknownIds).toEqual(["b"]);
    expect(buckets.completed.map((d) => d.id)).toEqual(["a"]);
  });

  it("treats a cancelled document as finished, not failed", () => {
    const buckets = splitRosterByState(["a"], rosterOf(doc("a", "cancelled")));

    expect(buckets.completed.map((d) => d.id)).toEqual(["a"]);
    expect(buckets.failed).toEqual([]);
  });

  it("buckets deleted documents instead of leaving them unreported", () => {
    // Otherwise the batch waits forever on a document that no longer exists.
    const buckets = splitRosterByState(
      ["a", "b"],
      rosterOf(doc("a", "completed")),
      new Set(["b"]),
    );

    expect(buckets.deletedIds).toEqual(["b"]);
    expect(buckets.unknownIds).toEqual([]);
  });

  it("prefers the deleted bucket even when a stale document is still cached", () => {
    const buckets = splitRosterByState(
      ["a"],
      rosterOf(doc("a", "chunking")),
      new Set(["a"]),
    );

    expect(buckets.deletedIds).toEqual(["a"]);
    expect(buckets.processing).toEqual([]);
  });

  it("counts the metadata gate as awaiting a decision", () => {
    const buckets = splitRosterByState(
      ["a"],
      rosterOf(doc("a", "metadata_awaiting_approval")),
    );

    expect(buckets.awaiting.map((d) => d.id)).toEqual(["a"]);
  });
});
