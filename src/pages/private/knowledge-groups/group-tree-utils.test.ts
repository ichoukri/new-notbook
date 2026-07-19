import { describe, expect, it } from "vitest";
import type { TKnowledgeGroupTreeNode } from "@/core/knowledge-groups";
import { collectGroupSubtreeIds, flattenGroupTree } from "./group-tree-utils";

function group(
  id: string,
  children: TKnowledgeGroupTreeNode[] = [],
): TKnowledgeGroupTreeNode {
  return {
    id,
    name: id,
    description: "",
    parentId: null,
    status: "active",
    datasetIds: [],
    descendantDatasetIds: [],
    metadata: null,
    createdAt: "2026-07-19",
    updatedAt: "2026-07-19",
    children,
  };
}

describe("knowledge group tree utilities", () => {
  it("preserves hierarchy order and depth", () => {
    const tree = [group("plans", [group("drive", [group("motor")])])];

    expect(
      flattenGroupTree(tree).map(({ group: item, depth }) => [item.id, depth]),
    ).toEqual([
      ["plans", 0],
      ["drive", 1],
      ["motor", 2],
    ]);
  });

  it("excludes a group and descendants from its parent choices", () => {
    const tree = [
      group("plans", [group("drive", [group("motor")])]),
      group("manuals"),
    ];

    expect([...collectGroupSubtreeIds(tree, "drive")]).toEqual([
      "drive",
      "motor",
    ]);
  });
});
