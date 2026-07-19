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
