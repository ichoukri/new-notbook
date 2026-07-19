export type TBackendKnowledgeGroupTreeNode = {
  id: string;
  name: string;
  description?: string | null;
  tenant_id: string;
  created_by: string;
  parent_id?: string | null;
  status: "active" | "archived";
  dataset_ids: string[];
  descendant_dataset_ids: string[];
  group_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  children: TBackendKnowledgeGroupTreeNode[];
};

export type TKnowledgeGroupTreeNode = {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  status: "active" | "archived";
  datasetIds: string[];
  descendantDatasetIds: string[];
  children: TKnowledgeGroupTreeNode[];
};

export function mapBackendKnowledgeGroupTree(
  group: TBackendKnowledgeGroupTreeNode,
): TKnowledgeGroupTreeNode {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? "",
    parentId: group.parent_id ?? null,
    status: group.status,
    datasetIds: group.dataset_ids,
    descendantDatasetIds: group.descendant_dataset_ids,
    children: group.children.map(mapBackendKnowledgeGroupTree),
  };
}
