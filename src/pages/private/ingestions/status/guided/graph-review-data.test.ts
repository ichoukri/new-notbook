import { describe, expect, it } from "vitest";
import {
  formatGraphType,
  parseGraphEntityPage,
  parseGraphRelationPage,
  parseGraphRun,
} from "./graph-review-data";

describe("guided graph review response parsing", () => {
  it("parses direct and wrapped extraction-run responses", () => {
    expect(
      parseGraphRun({
        id: "run-1",
        status: "completed",
        chunk_version: 4,
        ontology_version: "mining-v1",
        extractor_model: "model-a",
        stats: { entity_candidates: 8 },
      }),
    ).toMatchObject({
      id: "run-1",
      status: "completed",
      chunkVersion: 4,
      ontologyVersion: "mining-v1",
      extractorModel: "model-a",
      stats: { entity_candidates: 8 },
    });

    expect(
      parseGraphRun({
        data: {
          run_id: "run-2",
          status: "COMPLETED",
          chunkVersion: "5",
        },
      }),
    ).toMatchObject({ id: "run-2", status: "completed", chunkVersion: 5 });
    expect(parseGraphRun({ status: "completed" })).toBeNull();
  });

  it("normalizes paginated entity evidence, status, confidence, and metadata", () => {
    const page = parseGraphEntityPage(
      {
        data: {
          items: [
            {
              id: "entity-1",
              canonical_id: "equipment:6210-ml-2175",
              name: "6210-ML-2175",
              entity_type: "Equipment",
              aliases: ["SAG Mill", "SAG Mill", null],
              confidence: "92",
              status: "accepted",
              page_number: "7",
              chunk_id: "chunk-1",
              evidence: [
                { text: "The mill drives the pinion.", page_number: 7 },
                { quote: "Inspect the main bearing.", page: "8" },
              ],
            },
            { name: "missing id" },
          ],
          total: "34",
          offset: "12",
          limit: "12",
        },
      },
      0,
      20,
    );

    expect(page).toMatchObject({ total: 34, offset: 12, limit: 12 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: "entity-1",
      canonicalId: "equipment:6210-ml-2175",
      entityType: "Equipment",
      aliases: ["SAG Mill"],
      confidence: 0.92,
      status: "approved",
      pageNumber: 7,
      chunkId: "chunk-1",
    });
    expect(page.items[0].evidence).toEqual([
      {
        text: "The mill drives the pinion.",
        pageNumber: 7,
        chunkId: "chunk-1",
      },
      {
        text: "Inspect the main bearing.",
        pageNumber: 8,
        chunkId: "chunk-1",
      },
    ]);
  });

  it("accepts array relation fallbacks and fails unknown statuses closed", () => {
    const page = parseGraphRelationPage(
      [
        {
          candidate_id: "relation-1",
          sourceCanonicalId: "component:bearing",
          targetCanonicalId: "equipment:mill",
          relationType: "PART_OF",
          review_status: "new-backend-state",
          confidence: 0.76,
          evidence_text: "The bearing is part of the mill.",
        },
      ],
      24,
      12,
    );

    expect(page).toMatchObject({ total: 1, offset: 24, limit: 12 });
    expect(page.items[0]).toMatchObject({
      id: "relation-1",
      sourceName: "component:bearing",
      targetName: "equipment:mill",
      relationType: "PART_OF",
      status: "pending",
      confidence: 0.76,
    });
    expect(page.items[0].evidence[0].text).toBe(
      "The bearing is part of the mill.",
    );
  });

  it("formats closed ontology values for customer-facing labels", () => {
    expect(formatGraphType("MaintenanceTask")).toBe("Maintenance Task");
    expect(formatGraphType("HAS_FAILURE_MODE")).toBe("Has Failure Mode");
  });
});
