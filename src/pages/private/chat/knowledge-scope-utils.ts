import type { TDataset } from "@/core/datasets";
import type { TKnowledgeGroupTreeNode } from "@/core/knowledge-groups";

export type TKnowledgeScopeOption = {
  value: string;
  id: string;
  type: "group" | "dataset";
  name: string;
  depth: number;
  datasetCount: number;
};

export function flattenKnowledgeScopes(
  groups: TKnowledgeGroupTreeNode[],
  datasets: TDataset[],
): TKnowledgeScopeOption[] {
  const datasetsById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
  const groupedDatasetIds = new Set<string>();
  const options: TKnowledgeScopeOption[] = [];

  const visit = (group: TKnowledgeGroupTreeNode, depth: number) => {
    options.push({
      value: `group:${group.id}`,
      id: group.id,
      type: "group",
      name: group.name,
      depth,
      datasetCount: group.descendantDatasetIds.length,
    });

    for (const datasetId of group.datasetIds) {
      if (groupedDatasetIds.has(datasetId)) continue;
      const dataset = datasetsById.get(datasetId);
      if (!dataset) continue;
      groupedDatasetIds.add(datasetId);
      options.push({
        value: `dataset:${dataset.id}`,
        id: dataset.id,
        type: "dataset",
        name: dataset.name,
        depth: depth + 1,
        datasetCount: 1,
      });
    }
    for (const child of group.children) visit(child, depth + 1);
  };

  for (const group of groups) visit(group, 0);
  for (const dataset of datasets) {
    if (groupedDatasetIds.has(dataset.id)) continue;
    options.push({
      value: `dataset:${dataset.id}`,
      id: dataset.id,
      type: "dataset",
      name: dataset.name,
      depth: 0,
      datasetCount: 1,
    });
  }
  return options;
}

export function buildKnowledgeScopePayload(scope: TKnowledgeScopeOption) {
  return scope.type === "group"
    ? { knowledge_group_id: scope.id }
    : { dataset_id: scope.id };
}
