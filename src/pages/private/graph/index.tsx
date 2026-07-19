import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  Database,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  GRAPH_ENTITY_TYPES,
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
import { NeighborhoodPanel } from "./neighborhood-panel";

const ENTITY_PAGE_SIZE = 24;
const NEIGHBORHOOD_LIMIT = 100;

const EMPTY_ENTITY_PAGE: TGraphEntityPage = {
  items: [],
  total: 0,
  offset: 0,
  limit: ENTITY_PAGE_SIZE,
};

type TScopeKind = "dataset" | "document";

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
  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [documents, setDocuments] = useState<TIngestionDocument[]>([]);
  const [scopeKind, setScopeKind] = useState<TScopeKind>("dataset");
  const [datasetId, setDatasetId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [scopeLoading, setScopeLoading] = useState(true);
  const [scopeError, setScopeError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const [offset, setOffset] = useState(0);
  const [entityPage, setEntityPage] =
    useState<TGraphEntityPage>(EMPTY_ENTITY_PAGE);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError] = useState<TGraphErrorState | null>(null);

  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [depth, setDepth] = useState<1 | 2>(1);
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

  useEffect(() => {
    let cancelled = false;

    const loadScopes = async () => {
      setScopeLoading(true);
      setScopeError("");
      try {
        const [datasetResponse, documentResponse] = await Promise.all([
          backendApi.findMany<TBackendDataset>("/datasets/", {
            include_documents: "true",
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

  useEffect(() => {
    if (datasets.length > 0 && !datasets.some((dataset) => dataset.id === datasetId)) {
      setDatasetId(datasets[0].id);
    }
  }, [datasetId, datasets]);

  useEffect(() => {
    if (
      documents.length > 0 &&
      !documents.some((document) => document.id === documentId)
    ) {
      setDocumentId(documents[0].id);
    }
  }, [documentId, documents]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const scope = useMemo<TGraphScope | null>(() => {
    if (scopeKind === "dataset") {
      return datasetId ? { kind: "dataset", datasetId } : null;
    }
    return documentId
      ? { kind: "documents", documentIds: [documentId] }
      : null;
  }, [datasetId, documentId, scopeKind]);

  useEffect(() => {
    if (!scope) {
      setEntityPage(EMPTY_ENTITY_PAGE);
      setSelectedEntityId("");
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
        if (cancelled) return;

        const mapped = mapBackendGraphEntityPage(response);
        setEntityPage(mapped);
        setSelectedEntityId((current) =>
          mapped.items.some((entity) => entity.canonicalId === current)
            ? current
            : mapped.items[0]?.canonicalId ?? "",
        );
      } catch (error) {
        if (!cancelled) {
          setEntityPage({ ...EMPTY_ENTITY_PAGE, offset });
          setSelectedEntityId("");
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

  const changeScopeKind = (kind: TScopeKind) => {
    setScopeKind(kind);
    setOffset(0);
    setSelectedEntityId("");
    setNeighborhood(null);
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
        <section className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-64 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search entity names or aliases…"
                className="pl-9"
              />
            </div>

            <div className="flex h-9 items-center rounded-lg bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => changeScopeKind("dataset")}
                className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all ${
                  scopeKind === "dataset"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <Database className="size-3.5" /> Dataset
              </button>
              <button
                type="button"
                onClick={() => changeScopeKind("document")}
                className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all ${
                  scopeKind === "document"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <FileText className="size-3.5" /> Document
              </button>
            </div>

            {scopeKind === "dataset" ? (
              <Select
                value={datasetId}
                onValueChange={(value) => {
                  setDatasetId(value);
                  setOffset(0);
                }}
                disabled={scopeLoading || datasets.length === 0}
              >
                <SelectTrigger className="w-56">
                  <SelectValue
                    placeholder={scopeLoading ? "Loading datasets…" : "Choose dataset"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={documentId}
                onValueChange={(value) => {
                  setDocumentId(value);
                  setOffset(0);
                }}
                disabled={scopeLoading || documents.length === 0}
              >
                <SelectTrigger className="w-64">
                  <SelectValue
                    placeholder={scopeLoading ? "Loading documents…" : "Choose document"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((document) => (
                    <SelectItem key={document.id} value={document.id}>
                      {document.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={entityType}
              onValueChange={(value) => {
                setEntityType(value);
                setOffset(0);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All entity types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entity types</SelectItem>
                {GRAPH_ENTITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600">
              <input
                type="checkbox"
                checked={includeExcluded}
                onChange={(event) => {
                  setIncludeExcluded(event.target.checked);
                  setOffset(0);
                }}
                className="size-3.5 rounded border-gray-300 accent-indigo-600"
              />
              Include excluded
            </label>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Refresh knowledge graph"
              title="Refresh"
              disabled={!scope || entitiesLoading}
              onClick={() => setReloadKey((current) => current + 1)}
            >
              {entitiesLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
            </Button>
          </div>

          {scopeError && (
            <p className="mt-2 text-xs text-red-600">{scopeError}</p>
          )}
          {!scopeLoading && !scope && !scopeError && (
            <p className="mt-2 text-xs text-amber-700">
              No accessible {scopeKind === "dataset" ? "dataset" : "document"} is
              available for graph exploration.
            </p>
          )}
        </section>

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
              onSelect={setSelectedEntityId}
              onPageChange={setOffset}
            />
            <NeighborhoodPanel
              selectedEntity={selectedEntity}
              neighborhood={neighborhood}
              depth={depth}
              isLoading={neighborhoodLoading}
              error={neighborhoodError}
              onDepthChange={setDepth}
              onSelectEntity={setSelectedEntityId}
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
