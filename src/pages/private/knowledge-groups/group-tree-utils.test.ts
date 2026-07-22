import { describe, expect, it } from "vitest";
import type { TKnowledgeGroupTreeNode } from "@/core/knowledge-groups";
import {
  collectDeletionOrder,
  collectGroupSubtreeIds,
  countDescendantGroups,
  flattenGroupTree,
} from "./group-tree-utils";

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

  it("orders a subtree deletion from the leaves inward", () => {
    // The API refuses to delete a group that still has children, so this order
    // is what makes a cascade delete possible at all.
    const tree = group("plans", [
      group("drive", [group("motor")]),
      group("layouts"),
    ]);

    expect(collectDeletionOrder(tree).map((node) => node.id)).toEqual([
      "motor",
      "drive",
      "layouts",
      "plans",
    ]);
  });

  it("never lists a group before one of its descendants", () => {
    const tree = group("root", [
      group("x", [group("x1"), group("x2", [group("x2a")])]),
      group("y"),
    ]);
    const order = collectDeletionOrder(tree).map((node) => node.id);
    const at = (id: string) => order.indexOf(id);

    expect(at("x1")).toBeLessThan(at("x"));
    expect(at("x2a")).toBeLessThan(at("x2"));
    expect(at("x2")).toBeLessThan(at("x"));
    expect(order.at(-1)).toBe("root");
  });

  it("returns just the group when it has no children", () => {
    expect(collectDeletionOrder(group("solo")).map((n) => n.id)).toEqual([
      "solo",
    ]);
  });

  it("counts descendants at every level, excluding the group itself", () => {
    const tree = group("plans", [
      group("drive", [group("motor")]),
      group("layouts"),
    ]);

    expect(countDescendantGroups(tree)).toBe(3);
    expect(countDescendantGroups(group("solo"))).toBe(0);
  });
});
