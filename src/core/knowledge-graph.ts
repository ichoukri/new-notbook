import { mapSourceRelativePaths } from "@/core/source-provenance";

export const GRAPH_ENTITY_TYPES = [
  "Equipment",
  "Component",
  "Procedure",
  "MaintenanceTask",
  "FailureMode",
  "SafetyHazard",
  "SparePart",
  "Instrument",
  "Parameter",
  "Document",
  "Location",
  "Lubricant",
  "LubricationPoint",
] as const;

export type TGraphScope =
  | { kind: "dataset"; datasetId: string }
  | { kind: "documents"; documentIds: string[] };

export type TBackendGraphEntity = {
  canonical_id: string;
  name: string;
  normalized_name: string;
  entity_type: string;
  description?: string | null;
  aliases?: string[] | null;
  confidence?: number | null;
  excluded?: boolean;
  merged_into?: string | null;
  curated_at?: string | null;
  curated_by?: string | null;
  supporting_document_count?: number;
  evidence_count?: number;
  supporting_document_ids?: string[];
};

export type TGraphEntity = {
  canonicalId: string;
  name: string;
  normalizedName: string;
  entityType: string;
  description: string;
  aliases: string[];
  confidence: number | null;
  excluded: boolean;
  mergedInto: string | null;
  curatedAt: string | null;
  curatedBy: string | null;
  supportingDocumentCount: number;
  evidenceCount: number;
  supportingDocumentIds: string[];
};

export type TBackendGraphEdge = {
  id: string;
  relation_type: string;
  source_canonical_id: string;
  target_canonical_id: string;
  description?: string | null;
  confidence?: number | null;
  citation_ids?: string[];
};

export type TGraphEdge = {
  id: string;
  relationType: string;
  sourceCanonicalId: string;
  targetCanonicalId: string;
  description: string;
  confidence: number | null;
  citationIds: string[];
};

export type TBackendGraphCitation = {
  id: string;
  document_id: string;
  document_name: string;
  source_relative_path?: string | null;
  source_relative_paths?: string[] | null;
  chunk_id: string;
  chunk_index: number;
  page_number?: number | null;
  evidence_text: string;
  graph_input_hash: string;
};

export type TGraphCitation = {
  id: string;
  documentId: string;
  documentName: string;
  sourceRelativePaths: string[];
  chunkId: string;
  chunkIndex: number;
  pageNumber: number | null;
  evidenceText: string;
  graphInputHash: string;
};

export type TBackendGraphNeighborhood = {
  center_id: string;
  depth: 1 | 2;
  nodes: TBackendGraphEntity[];
  edges: TBackendGraphEdge[];
  citations: TBackendGraphCitation[];
  truncated: boolean;
};

export type TGraphNeighborhood = {
  centerId: string;
  depth: 1 | 2;
  nodes: TGraphEntity[];
  edges: TGraphEdge[];
  citations: TGraphCitation[];
  truncated: boolean;
};

export type TBackendGraphEntityPage = {
  items: TBackendGraphEntity[];
  total: number;
  offset: number;
  limit: number;
};

export type TGraphEntityPage = {
  items: TGraphEntity[];
  total: number;
  offset: number;
  limit: number;
};

export function mapBackendGraphEntity(
  entity: TBackendGraphEntity,
): TGraphEntity {
  return {
    canonicalId: entity.canonical_id,
    name: entity.name,
    normalizedName: entity.normalized_name,
    entityType: entity.entity_type,
    description: entity.description ?? "",
    aliases: entity.aliases ?? [],
    confidence:
      typeof entity.confidence === "number" ? entity.confidence : null,
    excluded: entity.excluded ?? false,
    mergedInto: entity.merged_into ?? null,
    curatedAt: entity.curated_at ?? null,
    curatedBy: entity.curated_by ?? null,
    supportingDocumentCount: entity.supporting_document_count ?? 0,
    evidenceCount: entity.evidence_count ?? 0,
    supportingDocumentIds: entity.supporting_document_ids ?? [],
  };
}

export function mapBackendGraphEntityPage(
  page: TBackendGraphEntityPage,
): TGraphEntityPage {
  return {
    items: page.items.map(mapBackendGraphEntity),
    total: page.total,
    offset: page.offset,
    limit: page.limit,
  };
}

export function mapBackendGraphNeighborhood(
  neighborhood: TBackendGraphNeighborhood,
): TGraphNeighborhood {
  return {
    centerId: neighborhood.center_id,
    depth: neighborhood.depth,
    nodes: neighborhood.nodes.map(mapBackendGraphEntity),
    edges: neighborhood.edges.map((edge) => ({
      id: edge.id,
      relationType: edge.relation_type,
      sourceCanonicalId: edge.source_canonical_id,
      targetCanonicalId: edge.target_canonical_id,
      description: edge.description ?? "",
      confidence:
        typeof edge.confidence === "number" ? edge.confidence : null,
      citationIds: edge.citation_ids ?? [],
    })),
    citations: neighborhood.citations.map((citation) => ({
      id: citation.id,
      documentId: citation.document_id,
      documentName: citation.document_name,
      sourceRelativePaths: mapSourceRelativePaths(
        citation.source_relative_paths,
        citation.source_relative_path,
      ),
      chunkId: citation.chunk_id,
      chunkIndex: citation.chunk_index,
      pageNumber:
        typeof citation.page_number === "number" ? citation.page_number : null,
      evidenceText: citation.evidence_text,
      graphInputHash: citation.graph_input_hash,
    })),
    truncated: neighborhood.truncated,
  };
}

export function appendGraphScope(
  params: URLSearchParams,
  scope: TGraphScope,
): URLSearchParams {
  if (scope.kind === "dataset") {
    if (scope.datasetId) params.set("dataset_id", scope.datasetId);
    return params;
  }

  for (const documentId of scope.documentIds) {
    if (documentId) params.append("document_ids", documentId);
  }
  return params;
}

export function buildGraphPath(
  pathname: string,
  scope: TGraphScope,
  values: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const params = appendGraphScope(new URLSearchParams(), scope);

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function graphEntityPath(canonicalId: string): string {
  return `/graph/entities/${encodeURIComponent(canonicalId)}`;
}

export function formatGraphLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
