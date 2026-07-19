import { describe, expect, it } from "vitest";
import {
  mapBackendGroundedAnswerResponse,
  mapBackendRetrievalSearchHit,
  mapBackendRetrievalSearchDebug,
  type TBackendGroundedAnswerResponse,
} from "@/core/retrieval";

describe("graph retrieval mappers", () => {
  it("maps graph diagnostics without changing legacy debug responses", () => {
    expect(
      mapBackendRetrievalSearchDebug({
        expanded_queries: ["main bearing"],
        candidate_limit: 40,
        per_query_candidate_counts: [
          {
            query: "main bearing",
            candidate_count: 12,
            graph_outcome: "ok",
            graph_seed_count: 2,
            graph_evidence_count: 7,
          },
        ],
        final_candidate_count: 8,
        graph_outcome: "ok",
        graph_seed_count: 2,
        graph_evidence_count: 7,
      }),
    ).toMatchObject({
      graphOutcome: "ok",
      graphSeedCount: 2,
      graphEvidenceCount: 7,
      perQueryCandidateCounts: [
        {
          graphOutcome: "ok",
          graphSeedCount: 2,
          graphEvidenceCount: 7,
        },
      ],
    });

    expect(
      mapBackendRetrievalSearchDebug({
        expanded_queries: ["bearing"],
        candidate_limit: 20,
        per_query_candidate_counts: [
          { query: "bearing", candidate_count: 4 },
        ],
        final_candidate_count: 4,
      }),
    ).toMatchObject({
      graphOutcome: null,
      graphSeedCount: 0,
      graphEvidenceCount: 0,
    });
  });

  it("maps a grounded answer and its server-validated citation", () => {
    const response: TBackendGroundedAnswerResponse = {
      query: "How is the bearing lubricated?",
      answer: "Use the approved lubrication procedure. [1]",
      abstained: false,
      abstention_reason: null,
      citation_indices: [1],
      citations: [
        {
          number: 1,
          chunk_id: "chunk-1",
          document_id: "doc-1",
          document_filename: "Grinding/manual.pdf",
          page_number: 12,
          excerpt: "Apply lubricant at the designated point.",
          source_url: null,
          source_relative_path: "1-Grinding 1/Manuals/manual.pdf",
          source_relative_paths: [
            "1-Grinding 1/Manuals/manual.pdf",
            "1-Grinding 1/Archive/manual.pdf",
          ],
        },
      ],
      hits: [
        {
          chunk_id: "chunk-1",
          document_id: "doc-1",
          document_filename: "Grinding/manual.pdf",
          document_file_type: "pdf",
          dataset_ids: ["dataset-1"],
          page_number: 12,
          chunk_index: 3,
          content_types: ["text"],
          score: 0.91,
          excerpt: "Apply lubricant at the designated point.",
          text_content: "Apply lubricant at the designated point.",
          embed_text: "Apply lubricant at the designated point.",
          embedding_mode: "raw",
          source_relative_path: "1-Grinding 1/Manuals/manual.pdf",
          source_relative_paths: [
            "1-Grinding 1/Manuals/manual.pdf",
            "1-Grinding 1/Archive/manual.pdf",
          ],
        },
      ],
      retrieval_debug: null,
    };

    expect(mapBackendGroundedAnswerResponse(response)).toMatchObject({
      abstained: false,
      abstentionReason: null,
      citationIndices: [1],
      citations: [
        {
          chunkId: "chunk-1",
          documentFilename: "Grinding/manual.pdf",
          pageNumber: 12,
          sourceRelativePaths: [
            "1-Grinding 1/Manuals/manual.pdf",
            "1-Grinding 1/Archive/manual.pdf",
          ],
        },
      ],
      hits: [
        {
          chunkId: "chunk-1",
          documentId: "doc-1",
          sourceRelativePaths: [
            "1-Grinding 1/Manuals/manual.pdf",
            "1-Grinding 1/Archive/manual.pdf",
          ],
        },
      ],
    });
  });

  it("falls back to a singular retrieval source path", () => {
    const hit = mapBackendRetrievalSearchHit({
      chunk_id: "chunk-legacy",
      document_id: "doc-legacy",
      document_filename: "manual.pdf",
      document_file_type: "pdf",
      dataset_ids: [],
      chunk_index: 0,
      content_types: ["text"],
      score: 0.8,
      excerpt: "Legacy evidence",
      text_content: "Legacy evidence",
      embed_text: "Legacy evidence",
      embedding_mode: "raw",
      source_relative_path: "Legacy/manual.pdf",
    });

    expect(hit.sourceRelativePaths).toEqual(["Legacy/manual.pdf"]);
  });
});
