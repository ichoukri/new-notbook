import { describe, expect, it } from "vitest";
import { getRevertStage, type TIngestionDocument } from "../ingestions";

function documentAt(
  processingStatus: string,
  processingDetails: Record<string, unknown> | null = null,
): TIngestionDocument {
  return {
    id: "doc-1",
    hash: "hash",
    filename: "doc.pdf",
    fileSize: 1,
    fileType: "pdf",
    sourceRelativePaths: [],
    userId: "user-1",
    tenantId: "tenant-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    datasetIds: [],
    processingStatus,
    mode: "guided",
    processingDetails,
    docMetadata: null,
    accessPolicy: null,
  };
}

describe("getRevertStage", () => {
  it("maps every revertible pause to its stage slug", () => {
    expect(getRevertStage(documentAt("chunking_awaiting_approval"))).toBe(
      "chunking",
    );
    expect(getRevertStage(documentAt("summarising_awaiting_approval"))).toBe(
      "summarising",
    );
    expect(
      getRevertStage(documentAt("graph_extraction_awaiting_approval")),
    ).toBe("graph");
    expect(getRevertStage(documentAt("metadata_awaiting_approval"))).toBe(
      "metadata",
    );
  });

  it("never offers a step back from the first review", () => {
    expect(
      getRevertStage(documentAt("partitioning_awaiting_approval")),
    ).toBeNull();
  });

  it("never offers a step back outside a review pause", () => {
    for (const status of [
      "queued",
      "partitioning",
      "summarising",
      "completed",
      "failed",
      "cancelled",
    ]) {
      expect(getRevertStage(documentAt(status))).toBeNull();
    }
  });

  it("blocks vectorization review once a knowledge graph was published", () => {
    // The backend records publication counts at publish time; that durable
    // marker — not any deployment flag — is what closes the boundary.
    const published = documentAt("vectorization_awaiting_approval", {
      graph_extraction: {
        run_id: "run-1",
        publication: { entities: 3 },
      },
    });
    expect(getRevertStage(published)).toBeNull();
  });

  it("allows vectorization review to step back when nothing was published", () => {
    expect(
      getRevertStage(documentAt("vectorization_awaiting_approval")),
    ).toBe("vectorization");
    // Extraction output alone is not the boundary — only publication is.
    expect(
      getRevertStage(
        documentAt("vectorization_awaiting_approval", {
          graph_extraction: { run_id: "run-1" },
        }),
      ),
    ).toBe("vectorization");
  });
});
