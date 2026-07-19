export type TBackendKnowledgeGroup = {
  id: string;
  name: string;
  description?: string | null;
  tenant_id: string;
  created_by: string;
  parent_id?: string | null;
  status: "active" | "archived";
  dataset_ids: string[];
  group_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type TBackendKnowledgeGroupTreeNode = TBackendKnowledgeGroup & {
  descendant_dataset_ids: string[];
  children: TBackendKnowledgeGroupTreeNode[];
};

export type TKnowledgeGroup = {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  status: "active" | "archived";
  datasetIds: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type TKnowledgeGroupTreeNode = TKnowledgeGroup & {
  descendantDatasetIds: string[];
  children: TKnowledgeGroupTreeNode[];
};

export type TKnowledgeGroupCreatePayload = {
  name: string;
  description?: string | null;
  parent_id?: string | null;
  dataset_ids: string[];
  group_metadata?: Record<string, unknown>;
};

export type TKnowledgeGroupUpdatePayload = Partial<
  TKnowledgeGroupCreatePayload & { status: "active" | "archived" }
>;

export function mapBackendKnowledgeGroup(
  group: TBackendKnowledgeGroup,
): TKnowledgeGroup {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? "",
    parentId: group.parent_id ?? null,
    status: group.status,
    datasetIds: group.dataset_ids,
    metadata: group.group_metadata ?? null,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  };
}

export function mapBackendKnowledgeGroupTree(
  group: TBackendKnowledgeGroupTreeNode,
): TKnowledgeGroupTreeNode {
  return {
    ...mapBackendKnowledgeGroup(group),
    descendantDatasetIds: group.descendant_dataset_ids,
    children: group.children.map(mapBackendKnowledgeGroupTree),
  };
}
