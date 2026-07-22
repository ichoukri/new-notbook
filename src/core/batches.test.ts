import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildIngestionReviewUrl,
  clearIngestionBatch,
  createIngestionBatchId,
  dedupeDocumentIds,
  loadIngestionBatch,
  saveIngestionBatch,
  type TIngestionBatch,
} from "./batches";

function makeBatch(overrides: Partial<TIngestionBatch> = {}): TIngestionBatch {
  return {
    id: "batch-1",
    datasetId: "dataset-1",
    mode: "guided",
    documentIds: ["doc-a", "doc-b"],
    startedAt: "2026-07-21T10:00:00.000Z",
    ...overrides,
  };
}

describe("ingestion batches", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("round-trips a batch through session storage", () => {
    const batch = makeBatch();

    expect(saveIngestionBatch(batch)).toBe(true);
    expect(loadIngestionBatch("batch-1")).toEqual(batch);
  });

  it("reports failure when storage throws so the caller can stay put", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

    expect(saveIngestionBatch(makeBatch())).toBe(false);

    setItem.mockRestore();
  });

  it("reports failure when a write is silently discarded", () => {
    // Some browsers accept setItem in private mode and drop the value, so the
    // write must be read back rather than trusted.
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => undefined);

    expect(saveIngestionBatch(makeBatch())).toBe(false);

    setItem.mockRestore();
  });

  it("returns null for unknown, missing, or blank ids", () => {
    expect(loadIngestionBatch("nope")).toBeNull();
    expect(loadIngestionBatch("")).toBeNull();
    expect(loadIngestionBatch(null)).toBeNull();
    expect(loadIngestionBatch(undefined)).toBeNull();
  });

  it("rejects stored values that do not match the schema", () => {
    sessionStorage.setItem(
      "fusion-rag:ingestion-batch:tampered",
      JSON.stringify({ id: "tampered", documentIds: [] }),
    );
    expect(loadIngestionBatch("tampered")).toBeNull();

    sessionStorage.setItem("fusion-rag:ingestion-batch:garbage", "not json");
    expect(loadIngestionBatch("garbage")).toBeNull();
  });

  it("rejects an unknown mode", () => {
    sessionStorage.setItem(
      "fusion-rag:ingestion-batch:bad-mode",
      JSON.stringify(makeBatch({ id: "bad-mode", mode: "turbo" as never })),
    );
    expect(loadIngestionBatch("bad-mode")).toBeNull();
  });

  it("clears a stored batch", () => {
    saveIngestionBatch(makeBatch());
    clearIngestionBatch("batch-1");
    expect(loadIngestionBatch("batch-1")).toBeNull();
  });

  it("generates distinct ids", () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => createIngestionBatchId()),
    );
    expect(ids.size).toBe(50);
  });

  it("collapses repeated document ids while preserving order", () => {
    // Content-hash matching can finalize several uploaded files onto one
    // canonical document; keeping both would double every count in the queue.
    expect(dedupeDocumentIds(["b", "a", "b", "c", "a"])).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(dedupeDocumentIds(["a", "", "b"])).toEqual(["a", "b"]);
    expect(dedupeDocumentIds([])).toEqual([]);
  });

  it("builds a review url carrying the batch and dataset", () => {
    expect(
      buildIngestionReviewUrl({ id: "b1", datasetId: "d1" }),
    ).toBe("/ingestions/review?batch=b1&dataset_id=d1");
  });
});
