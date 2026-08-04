import { GRAPH_ENTITY_TYPES } from "@/core/knowledge-graph";
import { isCanonicalEntityId } from "./graph-explorer-utils";

export type TScopeKind = "dataset" | "document";

/**
 * Everything that decides what the explorer is showing. It lives in the URL so
 * a view can be shared, bookmarked and restored, and so browser back/forward
 * walks the entities you visited.
 */
export type TGraphExplorerState = {
  scopeKind: TScopeKind;
  datasetId: string;
  documentId: string;
  search: string;
  entityType: string;
  includeExcluded: boolean;
  offset: number;
  entityId: string;
  depth: 1 | 2;
};

export const DEFAULT_GRAPH_EXPLORER_STATE: TGraphExplorerState = {
  scopeKind: "dataset",
  datasetId: "",
  documentId: "",
  search: "",
  entityType: "all",
  includeExcluded: false,
  offset: 0,
  entityId: "",
  depth: 1,
};

const PARAM = {
  scope: "scope",
  dataset: "dataset",
  document: "document",
  search: "q",
  entityType: "type",
  includeExcluded: "excluded",
  offset: "offset",
  entity: "entity",
  depth: "depth",
} as const;

/** Mirrors the backend `search` query constraint. */
const SEARCH_MAX_LENGTH = 300;

const ENTITY_TYPE_VALUES: ReadonlySet<string> = new Set(GRAPH_ENTITY_TYPES);

/**
 * Reads explorer state from the URL. Every value is validated — a hand-edited
 * or stale link falls back to the default rather than sending junk to the API.
 */
export function readGraphExplorerState(
  params: URLSearchParams,
): TGraphExplorerState {
  const entityType = params.get(PARAM.entityType) ?? "";
  const entityId = params.get(PARAM.entity) ?? "";
  // Strict digits only: `parseInt` would happily read "12.7abc" as 12.
  const rawOffset = params.get(PARAM.offset) ?? "";
  const offset = /^\d+$/.test(rawOffset) ? Number.parseInt(rawOffset, 10) : 0;

  return {
    scopeKind: params.get(PARAM.scope) === "document" ? "document" : "dataset",
    datasetId: params.get(PARAM.dataset) ?? "",
    documentId: params.get(PARAM.document) ?? "",
    search: (params.get(PARAM.search) ?? "").slice(0, SEARCH_MAX_LENGTH),
    entityType: ENTITY_TYPE_VALUES.has(entityType) ? entityType : "all",
    includeExcluded: params.get(PARAM.includeExcluded) === "1",
    offset: Number.isSafeInteger(offset) ? offset : 0,
    entityId: isCanonicalEntityId(entityId) ? entityId : "",
    depth: params.get(PARAM.depth) === "2" ? 2 : 1,
  };
}

/**
 * Serializes explorer state, omitting every default so shared links stay short.
 * An explicitly chosen id is kept even while the other scope kind is active, so
 * toggling dataset/document does not lose the selection on the other side; ids
 * that were only defaulted to are never written at all.
 */
export function writeGraphExplorerState(
  state: TGraphExplorerState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.scopeKind === "document") params.set(PARAM.scope, "document");
  if (state.datasetId) params.set(PARAM.dataset, state.datasetId);
  if (state.documentId) params.set(PARAM.document, state.documentId);

  const search = state.search.trim().slice(0, SEARCH_MAX_LENGTH);
  if (search) params.set(PARAM.search, search);
  if (state.entityType !== "all" && ENTITY_TYPE_VALUES.has(state.entityType)) {
    params.set(PARAM.entityType, state.entityType);
  }
  if (state.includeExcluded) params.set(PARAM.includeExcluded, "1");
  if (state.offset > 0) params.set(PARAM.offset, String(state.offset));
  if (isCanonicalEntityId(state.entityId)) {
    params.set(PARAM.entity, state.entityId);
  }
  if (state.depth === 2) params.set(PARAM.depth, "2");

  return params;
}

export type TGraphActiveFilter = {
  key: "search" | "entityType" | "includeExcluded";
  label: string;
  value: string;
};

/** The non-default filters, for the toolbar's "clear" affordances. */
export function getActiveGraphFilters(
  state: TGraphExplorerState,
): TGraphActiveFilter[] {
  const filters: TGraphActiveFilter[] = [];

  if (state.search.trim()) {
    filters.push({ key: "search", label: "Search", value: state.search.trim() });
  }
  if (state.entityType !== "all") {
    filters.push({
      key: "entityType",
      label: "Type",
      value: state.entityType,
    });
  }
  if (state.includeExcluded) {
    filters.push({
      key: "includeExcluded",
      label: "Showing",
      value: "Excluded entities",
    });
  }

  return filters;
}

/**
 * Picks the id the explorer should actually query: the one from the URL when it
 * is still available, otherwise the first option. Derived rather than written
 * back, so an unvisited default never pollutes the URL.
 */
export function resolveScopeId(
  requestedId: string,
  availableIds: string[],
): string {
  if (requestedId && availableIds.includes(requestedId)) {
    return requestedId;
  }
  return availableIds[0] ?? "";
}
