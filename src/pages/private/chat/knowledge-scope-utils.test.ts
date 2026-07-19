import { describe, expect, it } from "vitest";
import type { TDataset } from "@/core/datasets";
import type { TKnowledgeGroupTreeNode } from "@/core/knowledge-groups";
import {
  buildKnowledgeScopePayload,
  flattenKnowledgeScopes,
} from "./knowledge-scope-utils";

function dataset(id: string, name: string): TDataset {
  return {
    id,
    name,
    description: "",
    tenantId: "tenant",
    createdBy: "user",
    status: "active",
    createdAt: "2026-07-19",
    updatedAt: "2026-07-19",
    tags: [],
    metadata: null,
    documents: [],
    documentCount: 0,
  };
}

function group(
  id: string,
  name: string,
  datasetIds: string[],
  children: TKnowledgeGroupTreeNode[] = [],
): TKnowledgeGroupTreeNode {
  return {
    id,
    name,
    description: "",
    parentId: null,
    status: "active",
    datasetIds,
    metadata: null,
    createdAt: "2026-07-19",
    updatedAt: "2026-07-19",
    descendantDatasetIds: [
      ...new Set([
        ...datasetIds,
        ...children.flatMap((child) => child.descendantDatasetIds),
      ]),
    ],
    children,
  };
}

describe("knowledge scope hierarchy", () => {
  it("flattens parent groups and their leaf datasets without copying data", () => {
    const structure = group("structure", "1.1-Structure", ["dataset-b"]);
    const plans = group("plans", "Plans", ["dataset-a"], [structure]);

    const options = flattenKnowledgeScopes(
      [plans],
      [
        dataset("dataset-a", "1-Ensemble"),
        dataset("dataset-b", "Structure drawings"),
        dataset("dataset-c", "Ungrouped"),
      ],
    );

    expect(options.map(({ value, depth }) => [value, depth])).toEqual([
      ["group:plans", 0],
      ["dataset:dataset-a", 1],
      ["group:structure", 1],
      ["dataset:dataset-b", 2],
      ["dataset:dataset-c", 0],
    ]);
    expect(options[0].datasetCount).toBe(2);
  });

  it("builds an exclusive backend scope", () => {
    expect(
      buildKnowledgeScopePayload({
        value: "group:plans",
        id: "plans",
        type: "group",
        name: "Plans",
        depth: 0,
        datasetCount: 2,
      }),
    ).toEqual({ knowledge_group_id: "plans" });
  });
});
