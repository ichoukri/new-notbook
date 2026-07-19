import { describe, expect, it } from "vitest";
import {
  buildGraphPath,
  graphEntityPath,
  mapBackendGraphEntity,
  mapBackendGraphNeighborhood,
} from "@/core/knowledge-graph";

describe("knowledge graph mappers", () => {
  it("maps entity curation and evidence metadata", () => {
    expect(
      mapBackendGraphEntity({
        canonical_id: "ent_aaaaaaaaaaaaaaaaaaaaaaaa",
        name: "Mill 1",
        normalized_name: "mill 1",
        entity_type: "Equipment",
        aliases: ["Primary mill"],
        confidence: 0.91,
        excluded: true,
        merged_into: "ent_bbbbbbbbbbbbbbbbbbbbbbbb",
        curated_at: "2026-07-19T10:00:00Z",
        curated_by: "operator-1",
        supporting_document_count: 2,
        evidence_count: 7,
        supporting_document_ids: ["doc-1", "doc-2"],
      }),
    ).toMatchObject({
      canonicalId: "ent_aaaaaaaaaaaaaaaaaaaaaaaa",
      aliases: ["Primary mill"],
      excluded: true,
      mergedInto: "ent_bbbbbbbbbbbbbbbbbbbbbbbb",
      supportingDocumentCount: 2,
      evidenceCount: 7,
      supportingDocumentIds: ["doc-1", "doc-2"],
    });
  });

  it("maps a bounded neighborhood and its citations", () => {
    const result = mapBackendGraphNeighborhood({
      center_id: "ent_aaaaaaaaaaaaaaaaaaaaaaaa",
      depth: 2,
      nodes: [
        {
          canonical_id: "ent_aaaaaaaaaaaaaaaaaaaaaaaa",
          name: "Mill 1",
          normalized_name: "mill 1",
          entity_type: "Equipment",
          supporting_document_ids: ["doc-1"],
        },
      ],
      edges: [
        {
          id: "claim-1",
          relation_type: "PART_OF",
          source_canonical_id: "ent_bbbbbbbbbbbbbbbbbbbbbbbb",
          target_canonical_id: "ent_aaaaaaaaaaaaaaaaaaaaaaaa",
          citation_ids: ["citation-1"],
        },
      ],
      citations: [
        {
          id: "citation-1",
          document_id: "doc-1",
          document_name: "manual.pdf",
          source_relative_path: "Grinding/manual.pdf",
          chunk_id: "chunk-1",
          chunk_index: 4,
          page_number: 12,
          evidence_text: "The bearing is part of Mill 1.",
          graph_input_hash: "sha256:abc",
        },
      ],
      truncated: true,
    });

    expect(result).toMatchObject({
      centerId: "ent_aaaaaaaaaaaaaaaaaaaaaaaa",
      depth: 2,
      truncated: true,
    });
    expect(result.edges[0]).toMatchObject({
      relationType: "PART_OF",
      citationIds: ["citation-1"],
    });
    expect(result.citations[0]).toMatchObject({
      documentId: "doc-1",
      pageNumber: 12,
      sourceRelativePath: "Grinding/manual.pdf",
    });
  });
});

describe("knowledge graph paths", () => {
  it("serializes repeated document scope without widening it", () => {
    const path = buildGraphPath(
      "/graph/entities",
      { kind: "documents", documentIds: ["doc one", "doc/two"] },
      { search: "mill bearing", include_excluded: false, offset: 20 },
    );
    const query = new URLSearchParams(path.split("?")[1]);

    expect(query.getAll("document_ids")).toEqual(["doc one", "doc/two"]);
    expect(query.get("search")).toBe("mill bearing");
    expect(query.get("include_excluded")).toBe("false");
    expect(query.get("offset")).toBe("20");
  });

  it("serializes dataset scope and safely encodes canonical IDs", () => {
    expect(
      buildGraphPath("/graph/entities", { kind: "dataset", datasetId: "set-1" }),
    ).toBe("/graph/entities?dataset_id=set-1");
    expect(graphEntityPath("equipment:Mill A/1")).toBe(
      "/graph/entities/equipment%3AMill%20A%2F1",
    );
  });
});
