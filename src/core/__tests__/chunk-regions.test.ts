import { describe, expect, it } from "vitest";
import { getChunkRegions } from "../ingestions";
import type { TIngestionChunk } from "../ingestions";

function chunk(chunkMetadata: Record<string, unknown> | null): TIngestionChunk {
  return {
    id: "chunk-1",
    documentId: "doc-1",
    chunkIndex: 0,
    chunkVersion: 1,
    pageNumber: 1,
    textContent: "text",
    summaryContent: null,
    charCount: 4,
    contentTypes: ["text"],
    chunkMetadata,
    ingestionStatus: "stored",
    isActive: true,
    createdAt: "2026-07-21T10:00:00.000Z",
  } as TIngestionChunk;
}

describe("getChunkRegions", () => {
  it("returns well-formed regions", () => {
    const regions = getChunkRegions(
      chunk({
        regions: [
          { page: 1, l: 0.1, t: 0.2, r: 0.3, b: 0.4 },
          { page: 2, l: 0, t: 0, r: 1, b: 1 },
        ],
      }),
    );

    expect(regions).toEqual([
      { page: 1, l: 0.1, t: 0.2, r: 0.3, b: 0.4 },
      { page: 2, l: 0, t: 0, r: 1, b: 1 },
    ]);
  });

  it("is empty for chunks with no metadata or no regions", () => {
    expect(getChunkRegions(chunk(null))).toEqual([]);
    expect(getChunkRegions(chunk({}))).toEqual([]);
    expect(getChunkRegions(chunk({ regions: [] }))).toEqual([]);
    expect(getChunkRegions(chunk({ regions: "nope" }))).toEqual([]);
  });

  it("skips entries missing a numeric field without dropping valid ones", () => {
    const regions = getChunkRegions(
      chunk({
        regions: [
          { page: 1, l: 0.1, t: 0.2, r: 0.3, b: 0.4 },
          { page: 1, l: 0.1, t: 0.2, r: 0.3 },
          { page: "x", l: 0.1, t: 0.2, r: 0.3, b: 0.4 },
          null,
          "garbage",
        ],
      }),
    );

    expect(regions).toEqual([{ page: 1, l: 0.1, t: 0.2, r: 0.3, b: 0.4 }]);
  });
});
