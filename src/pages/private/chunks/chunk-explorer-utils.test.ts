import { describe, expect, it } from "vitest";
import type { TIngestionChunk } from "@/core/ingestions";
import {
  formatJson,
  getChunkMetadataFields,
  getChunkPreview,
  getPrimaryContentType,
  matchesChunkSearch,
} from "./chunk-explorer-utils";

const chunk: TIngestionChunk = {
  id: "chunk-1",
  documentId: "doc-1",
  chunkIndex: 2,
  chunkVersion: 1,
  pageNumber: 3,
  textContent: "Raw policy text",
  summaryContent: "Policy summary",
  charCount: 42,
  tokenCount: 12,
  contentTypes: ["table", "text"],
  originalContent: null,
  chunkMetadata: { section: "Benefits" },
  vectorChunkId: null,
  embeddingModel: "embed-model",
  summaryModel: "summary-model",
  ingestionStatus: "completed",
  errorMessage: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("chunk explorer helpers", () => {
  it("uses summary content for compact previews when available", () => {
    expect(getChunkPreview(chunk)).toBe("Policy summary");
    expect(
      getChunkPreview({ ...chunk, summaryContent: null, textContent: "" }),
    ).toBe("No chunk content available.");
  });

  it("falls back to text content type", () => {
    expect(getPrimaryContentType(chunk)).toBe("table");
    expect(getPrimaryContentType({ ...chunk, contentTypes: [] })).toBe("text");
  });

  it("matches chunk search against title, raw text, and summary", () => {
    expect(matchesChunkSearch(chunk, "policy")).toBe(true);
    expect(matchesChunkSearch(chunk, "summary")).toBe(true);
    expect(matchesChunkSearch(chunk, "missing")).toBe(false);
  });

  it("formats metadata for display", () => {
    expect(formatJson({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(formatJson(null)).toBe("{}");
    expect(getChunkMetadataFields(chunk)).toContainEqual({
      key: "token_count",
      value: "12",
    });
  });
});
