import { describe, expect, it } from "vitest";
import type { TIngestionChunk } from "@/core/ingestions";
import { buildChunkPreview, splitIntoBlocks } from "./chunk-preview";

const baseChunk = (id: string, index: number, text: string): TIngestionChunk => ({
  id,
  documentId: "doc-1",
  chunkIndex: index,
  chunkVersion: 1,
  pageNumber: index + 1,
  textContent: text,
  summaryContent: `summary ${index}`,
  charCount: text.length,
  tokenCount: null,
  contentTypes: ["text"],
  originalContent: null,
  chunkMetadata: null,
  vectorChunkId: null,
  embeddingModel: null,
  summaryModel: null,
  ingestionStatus: "chunking_awaiting_approval",
  errorMessage: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("guided chunk preview helpers", () => {
  it("splits display text by paragraphs before falling back to lines", () => {
    expect(splitIntoBlocks("First\n\nSecond\n\nThird")).toEqual([
      "First",
      "Second",
      "Third",
    ]);
    expect(splitIntoBlocks("First\nSecond")).toEqual(["First", "Second"]);
  });

  it("previews staged edit, split, merge, and delete operations in order", () => {
    const chunks = [
      baseChunk("chunk-1", 0, "Original one"),
      baseChunk("chunk-2", 1, "Original two"),
      baseChunk("chunk-3", 2, "Original three"),
      baseChunk("chunk-4", 3, "Original four"),
    ];

    const preview = buildChunkPreview(
      chunks,
      [
        { op: "edit", chunk_id: "chunk-1", text_content: "Edited one" },
        {
          op: "split",
          chunk_id: "chunk-2",
          segments: ["Two A", "Two B"],
        },
        { op: "merge", chunk_ids: ["chunk-3", "chunk-4"] },
      ],
      false,
    );

    expect(preview.map((row) => row.status)).toEqual([
      "edited",
      "added",
      "added",
      "merged",
    ]);
    expect(preview.map((row) => row.content)).toEqual([
      "Edited one",
      "Two A",
      "Two B",
      "Original three\n\nOriginal four",
    ]);
  });

  it("keeps deleted rows visible without assigning a display index", () => {
    const preview = buildChunkPreview(
      [baseChunk("chunk-1", 0, "One"), baseChunk("chunk-2", 1, "Two")],
      [{ op: "delete", chunk_id: "chunk-1" }],
      false,
    );

    expect(preview[0]).toMatchObject({
      serverId: "chunk-1",
      status: "deleted",
      displayIndex: -1,
    });
    expect(preview[1]).toMatchObject({
      serverId: "chunk-2",
      status: "unchanged",
      displayIndex: 0,
    });
  });
});
