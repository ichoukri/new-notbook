import { describe, expect, it } from "vitest";
import type {
  TGraphEntity,
  TGraphNeighborhood,
} from "@/core/knowledge-graph";
import {
  GRAPH_OTHER_COLOR,
  computeNeighborhoodLayout,
  getEdgeGeometry,
  getEntityTypeColor,
  getGraphLegendEntries,
  truncateNodeLabel,
} from "./neighborhood-graph-utils";

function makeEntity(overrides: Partial<TGraphEntity>): TGraphEntity {
  return {
    canonicalId: "ent_aaaaaaaaaaaaaaaaaaaaaaaa",
    name: "Mill 1",
    normalizedName: "mill 1",
    entityType: "Equipment",
    description: "",
    aliases: [],
    confidence: 0.9,
    excluded: false,
    mergedInto: null,
    curatedAt: null,
    curatedBy: null,
    supportingDocumentCount: 1,
    evidenceCount: 4,
    supportingDocumentIds: ["doc-1"],
    ...overrides,
  };
}

const center = makeEntity({});
const bearing = makeEntity({
  canonicalId: "ent_bbbbbbbbbbbbbbbbbbbbbbbb",
  name: "Bearing 1",
  entityType: "Component",
  evidenceCount: 1,
});

function makeNeighborhood(
  overrides: Partial<TGraphNeighborhood>,
): TGraphNeighborhood {
  return {
    centerId: center.canonicalId,
    depth: 1,
    nodes: [center, bearing],
    edges: [
      {
        id: "edge-1",
        relationType: "PART_OF",
        sourceCanonicalId: bearing.canonicalId,
        targetCanonicalId: center.canonicalId,
        description: "",
        confidence: 0.9,
        citationIds: [],
      },
    ],
    citations: [],
    truncated: false,
    ...overrides,
  };
}

describe("getEntityTypeColor", () => {
  it("assigns the fixed categorical slots and folds the rest into Other", () => {
    expect(getEntityTypeColor("Equipment")).toBe("#2a78d6");
    expect(getEntityTypeColor("Component")).toBe("#008300");
    expect(getEntityTypeColor("Lubricant")).toBe(GRAPH_OTHER_COLOR);
    expect(getEntityTypeColor("UnknownType")).toBe(GRAPH_OTHER_COLOR);
  });
});

describe("getGraphLegendEntries", () => {
  it("lists only present slot types plus Other when needed", () => {
    const entries = getGraphLegendEntries([
      center,
      makeEntity({ canonicalId: "ent_cccccccccccccccccccccccc", entityType: "Lubricant" }),
    ]);
    expect(entries.map((entry) => entry.label)).toEqual(["Equipment", "Other"]);
  });

  it("omits Other when every type has a slot", () => {
    const entries = getGraphLegendEntries([center, bearing]);
    expect(entries.map((entry) => entry.label)).toEqual([
      "Equipment",
      "Component",
    ]);
  });
});

describe("computeNeighborhoodLayout", () => {
  it("pins the center at the origin and positions every node", () => {
    const layout = computeNeighborhoodLayout(makeNeighborhood({}));

    expect(layout.nodes).toHaveLength(2);
    const centerNode = layout.nodes.find((node) => node.isCenter);
    expect(centerNode?.x).toBe(0);
    expect(centerNode?.y).toBe(0);
    for (const node of layout.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.radius).toBeGreaterThanOrEqual(7);
    }
    expect(layout.bounds.width).toBeGreaterThan(0);
    expect(layout.bounds.height).toBeGreaterThan(0);
  });

  it("drops self-loops and edges pointing at missing nodes", () => {
    const layout = computeNeighborhoodLayout(
      makeNeighborhood({
        edges: [
          {
            id: "edge-self",
            relationType: "RELATES_TO",
            sourceCanonicalId: center.canonicalId,
            targetCanonicalId: center.canonicalId,
            description: "",
            confidence: null,
            citationIds: [],
          },
          {
            id: "edge-dangling",
            relationType: "RELATES_TO",
            sourceCanonicalId: center.canonicalId,
            targetCanonicalId: "ent_dddddddddddddddddddddddd",
            description: "",
            confidence: null,
            citationIds: [],
          },
        ],
      }),
    );
    expect(layout.edges).toHaveLength(0);
  });

  it("fans out parallel edges between the same pair", () => {
    const layout = computeNeighborhoodLayout(
      makeNeighborhood({
        edges: [
          {
            id: "edge-1",
            relationType: "PART_OF",
            sourceCanonicalId: bearing.canonicalId,
            targetCanonicalId: center.canonicalId,
            description: "",
            confidence: null,
            citationIds: [],
          },
          {
            id: "edge-2",
            relationType: "LUBRICATED_BY",
            sourceCanonicalId: center.canonicalId,
            targetCanonicalId: bearing.canonicalId,
            description: "",
            confidence: null,
            citationIds: [],
          },
        ],
      }),
    );

    expect(layout.edges).toHaveLength(2);
    const offsets = layout.edges.map((edge) => edge.curveOffset);
    expect(new Set(offsets).size).toBe(2);
    expect(offsets[0]).toBe(-offsets[1]);
  });

  it("produces drawable edge geometry", () => {
    const layout = computeNeighborhoodLayout(makeNeighborhood({}));
    const geometry = getEdgeGeometry(layout.edges[0]);
    expect(geometry.path).toMatch(/^M .+ Q .+$/);
    expect(Number.isFinite(geometry.labelX)).toBe(true);
    expect(Number.isFinite(geometry.labelY)).toBe(true);
  });
});

describe("truncateNodeLabel", () => {
  it("keeps short names and truncates long ones with an ellipsis", () => {
    expect(truncateNodeLabel("Mill 1")).toBe("Mill 1");
    expect(truncateNodeLabel("A very long equipment entity name")).toBe(
      "A very long equipme…",
    );
  });
});
