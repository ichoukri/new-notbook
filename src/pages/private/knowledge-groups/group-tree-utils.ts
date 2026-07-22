import type { TKnowledgeGroupTreeNode } from "@/core/knowledge-groups";

export type TFlatKnowledgeGroup = {
  group: TKnowledgeGroupTreeNode;
  depth: number;
};

export function flattenGroupTree(
  groups: TKnowledgeGroupTreeNode[],
): TFlatKnowledgeGroup[] {
  const flattened: TFlatKnowledgeGroup[] = [];
  const visit = (group: TKnowledgeGroupTreeNode, depth: number) => {
    flattened.push({ group, depth });
    for (const child of group.children) visit(child, depth + 1);
  };
  for (const group of groups) visit(group, 0);
  return flattened;
}

/**
 * Every group under `group`, deepest first, with `group` itself last.
 *
 * Deletion order matters: the API refuses to delete a group that still has
 * children, so a subtree can only be removed from the leaves inward.
 */
export function collectDeletionOrder(
  group: TKnowledgeGroupTreeNode,
): TKnowledgeGroupTreeNode[] {
  const ordered: TKnowledgeGroupTreeNode[] = [];
  const visit = (node: TKnowledgeGroupTreeNode) => {
    for (const child of node.children) visit(child);
    ordered.push(node);
  };
  visit(group);
  return ordered;
}

/** Total groups beneath `group`, excluding itself. */
export function countDescendantGroups(
  group: TKnowledgeGroupTreeNode,
): number {
  return group.children.reduce(
    (total, child) => total + 1 + countDescendantGroups(child),
    0,
  );
}

export function collectGroupSubtreeIds(
  groups: TKnowledgeGroupTreeNode[],
  groupId: string,
): Set<string> {
  const excluded = new Set<string>();
  const visit = (group: TKnowledgeGroupTreeNode, insideTarget: boolean) => {
    const inside = insideTarget || group.id === groupId;
    if (inside) excluded.add(group.id);
    for (const child of group.children) visit(child, inside);
  };
  for (const group of groups) visit(group, false);
  return excluded;
}
