import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendDocument,
  type TIngestionDocument,
  mapBackendDocument,
} from "@/core/ingestions";
import {
  buildGraphPath,
  graphEntityPath,
  mapBackendGraphEntityPage,
  mapBackendGraphNeighborhood,
  type TBackendGraphEntity,
  type TBackendGraphEntityPage,
  type TBackendGraphNeighborhood,
  type TGraphEntity,
  type TGraphEntityPage,
  type TGraphNeighborhood,
  type TGraphScope,
} from "@/core/knowledge-graph";
import { CurationDialogs, type TCurationAction, type TEntityEditPayload } from "./curation-dialogs";
import { EntityList } from "./entity-list";
import { getGraphErrorState, type TGraphErrorState } from "./graph-explorer-utils";
import { GraphToolbar } from "./graph-toolbar";
import {
  type TGraphExplorerState,
  type TScopeKind,
  readGraphExplorerState,
  resolveScopeId,
  writeGraphExplorerState,
} from "./graph-url-state";
import { NeighborhoodPanel } from "./neighborhood-panel";

const ENTITY_PAGE_SIZE = 24;
const NEIGHBORHOOD_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_ENTITY_PAGE: TGraphEntityPage = {
  items: [],
  total: 0,
  offset: 0,
  limit: ENTITY_PAGE_SIZE,
};

function deduplicateEntities(entities: TGraphEntity[]): TGraphEntity[] {
  return Array.from(
    new Map(entities.map((entity) => [entity.canonicalId, entity])).values(),
  );
}

function GraphServiceError({
  error,
  onRetry,
}: {
  error: TGraphErrorState;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-1 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8">
      <div className="max-w-lg text-center">
        <AlertTriangle className="mx-auto size-6 text-amber-600" />
        <h2 className="mt-3 text-base font-semibold text-amber-950">{error.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-amber-800">{error.message}</p>
        {error.retryable && (
          <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeGraphExplorerPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [documents, setDocuments] = useState<TIngestionDocument[]>([]);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [scopeError, setScopeError] = useState("");

  const [entityPage, setEntityPage] =
    useState<TGraphEntityPage>(EMPTY_ENTITY_PAGE);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError] = useState<TGraphErrorState | null>(null);

  const [neighborhood, setNeighborhood] =
    useState<TGraphNeighborhood | null>(null);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);
  const [neighborhoodError, setNeighborhoodError] =
    useState<TGraphErrorState | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [curationAction, setCurationAction] =
    useState<TCurationAction | null>(null);
  const [curationSaving, setCurationSaving] = useState(false);
  const [curationError, setCurationError] = useState("");

  // The URL is the single source of truth for what is on screen.
  const urlState = useMemo(
    () => readGraphExplorerState(searchParams),
    [searchParams],
  );

  const updateState = useCallback(
    (patch: Partial<TGraphExplorerState>, options?: { push?: boolean }) => {
      setSearchParams(
        (current) =>
          writeGraphExplorerState({
            ...readGraphExplorerState(current),
            ...patch,
          }),
        // Only entity hops and scope switches are worth a history entry;
        // filter tweaks would otherwise bury the back button.
        { replace: !options?.push },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;

    const loadScopes = async () => {
      setScopeLoading(true);
      setScopeError("");
      try {
        const [datasetResponse, documentResponse] = await Promise.all([
          backendApi.findMany<TBackendDataset>("/datasets/", {
            include_documents: "false",
            limit: "100",
            sort_by: "updated_at",
            sort_order: "desc",
          }),
          backendApi.findMany<TBackendDocument>("/documents/", {
            limit: "100",
            sort_by: "updated_at",
            sort_order: "desc",
          }),
        ]);

        if (!cancelled) {
          setDatasets(datasetResponse.map(mapBackendDataset));
          setDocuments(documentResponse.map(mapBackendDocument));
        }
      } catch (error) {
        if (!cancelled) {
          setScopeError(
            getApiErrorMessage(error, "Could not load graph scope options."),
          );
        }
      } finally {
        if (!cancelled) setScopeLoading(false);
      }
    };

    void loadScopes();
    return () => {
      cancelled = true;
    };
  }, []);

  // Scope ids are derived, never written back: a default the user never chose
  // stays out of the URL, so shared links only carry deliberate choices.
  const datasetId = useMemo(
    () => resolveScopeId(urlState.datasetId, datasets.map((dataset) => dataset.id)),
    [datasets, urlState.datasetId],
  );
  const documentId = useMemo(
    () =>
      resolveScopeId(urlState.documentId, documents.map((document) => document.id)),
    [documents, urlState.documentId],
  );

  const [debouncedSearch, setDebouncedSearch] = useState(urlState.search);
  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedSearch(urlState.search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [urlState.search]);

  const scope = useMemo<TGraphScope | null>(() => {
    if (urlState.scopeKind === "dataset") {
      return datasetId ? { kind: "dataset", datasetId } : null;
    }
    return documentId ? { kind: "documents", documentIds: [documentId] } : null;
  }, [datasetId, documentId, urlState.scopeKind]);

  const { entityType, includeExcluded, offset, depth } = urlState;

  useEffect(() => {
    if (!scope) {
      setEntityPage(EMPTY_ENTITY_PAGE);
      setEntitiesError(null);
      return;
    }

    let cancelled = false;
    const loadEntities = async () => {
      setEntitiesLoading(true);
      setEntitiesError(null);
      try {
        const path = buildGraphPath("/graph/entities", scope, {
          search: debouncedSearch || null,
          entity_type: entityType === "all" ? null : entityType,
          include_excluded: includeExcluded,
          offset,
          limit: ENTITY_PAGE_SIZE,
        });
        const response = await backendApi.get<TBackendGraphEntityPage>(path);
        if (!cancelled) setEntityPage(mapBackendGraphEntityPage(response));
      } catch (error) {
        if (!cancelled) {
          setEntityPage({ ...EMPTY_ENTITY_PAGE, offset });
          setEntitiesError(getGraphErrorState(error));
        }
      } finally {
        if (!cancelled) setEntitiesLoading(false);
      }
    };

    void loadEntities();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, entityType, includeExcluded, offset, reloadKey, scope]);

  // A link can pin an entity that is not on the current page; otherwise the
  // first result is the natural center.
  const selectedEntityId =
    urlState.entityId || entityPage.items[0]?.canonicalId || "";

  useEffect(() => {
    if (!scope || !selectedEntityId) {
      setNeighborhood(null);
      setNeighborhoodError(null);
      return;
    }

    let cancelled = false;
    const loadNeighborhood = async () => {
      setNeighborhoodLoading(true);
      setNeighborhoodError(null);
      try {
        const path = buildGraphPath(
          `${graphEntityPath(selectedEntityId)}/neighborhood`,
          scope,
          { depth, limit: NEIGHBORHOOD_LIMIT },
        );
        const response = await backendApi.get<TBackendGraphNeighborhood>(path);
        if (!cancelled) setNeighborhood(mapBackendGraphNeighborhood(response));
      } catch (error) {
        if (!cancelled) {
          setNeighborhood(null);
          setNeighborhoodError(getGraphErrorState(error));
        }
      } finally {
        if (!cancelled) setNeighborhoodLoading(false);
      }
    };

    void loadNeighborhood();
    return () => {
      cancelled = true;
    };
  }, [depth, reloadKey, scope, selectedEntityId]);

  const selectableEntities = useMemo(
    () => deduplicateEntities([...entityPage.items, ...(neighborhood?.nodes ?? [])]),
    [entityPage.items, neighborhood],
  );
  const selectedEntity =
    selectableEntities.find((entity) => entity.canonicalId === selectedEntityId) ??
    null;

  const selectEntity = (
    canonicalId: string,
    options?: { replace?: boolean },
  ) => {
    if (canonicalId === selectedEntityId) return;
    updateState({ entityId: canonicalId }, { push: !options?.replace });
  };

  const changeScopeKind = (kind: TScopeKind) => {
    if (kind === urlState.scopeKind) return;
    updateState({ scopeKind: kind, offset: 0, entityId: "" }, { push: true });
  };

  const closeCuration = () => {
    if (curationSaving) return;
    setCurationAction(null);
    setCurationError("");
  };

  const requireCurationContext = () => {
    if (!scope || !selectedEntity) {
      setCurationError("Select an entity in a valid scope first.");
      return null;
    }
    return { scope, entity: selectedEntity };
  };

  const editEntity = async (payload: TEntityEditPayload) => {
    const context = requireCurationContext();
    if (!context) return;

    setCurationSaving(true);
    setCurationError("");
    try {
      const path = buildGraphPath(
        graphEntityPath(context.entity.canonicalId),
        context.scope,
      );
      await backendApi.updateUser<TBackendGraphEntity>(path, payload);
      toast.success("Entity curation saved.");
      setCurationAction(null);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setCurationError(getApiErrorMessage(error, "Could not edit this entity."));
    } finally {
      setCurationSaving(false);
    }
  };

  const mergeEntity = async (targetCanonicalId: string) => {
    const context = requireCurationContext();
    if (!context) return;

    setCurationSaving(true);
    setCurationError("");
    try {
      const path = buildGraphPath(
        `${graphEntityPath(context.entity.canonicalId)}/merge`,
        context.scope,
      );
      await backendApi.create<unknown, { target_canonical_id: string }>(path, {
        target_canonical_id: targetCanonicalId,
      });
      toast.success(`"${context.entity.name}" merged into the target entity.`);
      setCurationAction(null);
      // The merged-away entity is no longer a meaningful center.
      updateState({ entityId: targetCanonicalId });
      setReloadKey((current) => current + 1);
    } catch (error) {
      setCurationError(getApiErrorMessage(error, "Could not merge this entity."));
    } finally {
      setCurationSaving(false);
    }
  };

  const excludeEntity = async () => {
    const context = requireCurationContext();
    if (!context) return;

    setCurationSaving(true);
    setCurationError("");
    try {
      const fullPath = buildGraphPath(
        graphEntityPath(context.entity.canonicalId),
        context.scope,
      );
      const entityPathSuffix = fullPath.slice("/graph/entities/".length);
      await backendApi.delete("/graph/entities", entityPathSuffix);
      toast.success(`"${context.entity.name}" excluded from the graph.`);
      setCurationAction(null);
      // It drops out of the default listing, so fall back to the first result.
      if (!urlState.includeExcluded) updateState({ entityId: "" });
      setReloadKey((current) => current + 1);
    } catch (error) {
      setCurationError(
        getApiErrorMessage(error, "Could not exclude this entity."),
      );
    } finally {
      setCurationSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/60">
      <Topbar title="Knowledge Graph" />

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5">
        <GraphToolbar
          state={urlState}
          datasets={datasets}
          documents={documents}
          datasetId={datasetId}
          documentId={documentId}
          scopeLoading={scopeLoading}
          scopeError={scopeError}
          hasScope={Boolean(scope)}
          entitiesLoading={entitiesLoading}
          onScopeKindChange={changeScopeKind}
          onDatasetChange={(value) =>
            updateState({ datasetId: value, offset: 0, entityId: "" })
          }
          onDocumentChange={(value) =>
            updateState({ documentId: value, offset: 0, entityId: "" })
          }
          onSearchChange={(value) => updateState({ search: value, offset: 0 })}
          onEntityTypeChange={(value) =>
            updateState({ entityType: value, offset: 0 })
          }
          onIncludeExcludedChange={(value) =>
            updateState({ includeExcluded: value, offset: 0 })
          }
          onClearFilters={() =>
            updateState({
              search: "",
              entityType: "all",
              includeExcluded: false,
              offset: 0,
            })
          }
          onRefresh={() => setReloadKey((current) => current + 1)}
        />

        {entitiesError ? (
          <GraphServiceError
            error={entitiesError}
            onRetry={() => setReloadKey((current) => current + 1)}
          />
        ) : (
          <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
            <EntityList
              entities={entityPage.items}
              selectedId={selectedEntityId}
              total={entityPage.total}
              offset={entityPage.offset}
              limit={entityPage.limit || ENTITY_PAGE_SIZE}
              isLoading={entitiesLoading}
              onSelect={selectEntity}
              onPageChange={(value) => updateState({ offset: value })}
            />
            <NeighborhoodPanel
              selectedEntity={selectedEntity}
              neighborhood={neighborhood}
              depth={depth}
              isLoading={neighborhoodLoading}
              error={neighborhoodError}
              onDepthChange={(value) => updateState({ depth: value })}
              onSelectEntity={selectEntity}
              onOpenDocument={(id) => navigate(`/documents/${id}`)}
              onRetry={() => setReloadKey((current) => current + 1)}
              onEdit={() => {
                setCurationError("");
                setCurationAction("edit");
              }}
              onMerge={() => {
                setCurationError("");
                setCurationAction("merge");
              }}
              onExclude={() => {
                setCurationError("");
                setCurationAction("exclude");
              }}
            />
          </div>
        )}
      </main>

      {curationAction && selectedEntity && (
        <CurationDialogs
          key={`${curationAction}:${selectedEntity.canonicalId}`}
          action={curationAction}
          entity={selectedEntity}
          mergeCandidates={selectableEntities}
          isSaving={curationSaving}
          error={curationError}
          onClose={closeCuration}
          onEdit={editEntity}
          onMerge={mergeEntity}
          onExclude={excludeEntity}
        />
      )}
    </div>
  );
}
