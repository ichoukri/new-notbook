import { Database, FileText, Link2, Loader2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TDataset } from "@/core/datasets";
import type { TIngestionDocument } from "@/core/ingestions";
import { GRAPH_ENTITY_TYPES, formatGraphLabel } from "@/core/knowledge-graph";
import { copyText } from "@/lib/copy-text";
import { cn } from "@/lib/utils";
import {
  type TGraphExplorerState,
  type TScopeKind,
  getActiveGraphFilters,
} from "./graph-url-state";

type GraphToolbarProps = {
  state: TGraphExplorerState;
  datasets: TDataset[];
  documents: TIngestionDocument[];
  datasetId: string;
  documentId: string;
  scopeLoading: boolean;
  scopeError: string;
  hasScope: boolean;
  entitiesLoading: boolean;
  onScopeKindChange: (kind: TScopeKind) => void;
  onDatasetChange: (datasetId: string) => void;
  onDocumentChange: (documentId: string) => void;
  onSearchChange: (search: string) => void;
  onEntityTypeChange: (entityType: string) => void;
  onIncludeExcludedChange: (includeExcluded: boolean) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
};

export function GraphToolbar({
  state,
  datasets,
  documents,
  datasetId,
  documentId,
  scopeLoading,
  scopeError,
  hasScope,
  entitiesLoading,
  onScopeKindChange,
  onDatasetChange,
  onDocumentChange,
  onSearchChange,
  onEntityTypeChange,
  onIncludeExcludedChange,
  onClearFilters,
  onRefresh,
}: GraphToolbarProps) {
  const activeFilters = getActiveGraphFilters(state);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={state.search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search entity names or aliases…"
            aria-label="Search entities"
            className="pl-9 pr-9"
          />
          {state.search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div
          className="flex h-9 items-center rounded-lg bg-gray-100 p-0.5"
          role="group"
          aria-label="Graph scope"
        >
          {(
            [
              { kind: "dataset", icon: Database, label: "Dataset" },
              { kind: "document", icon: FileText, label: "Document" },
            ] as const
          ).map(({ kind, icon: Icon, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => onScopeKindChange(kind)}
              aria-pressed={state.scopeKind === kind}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                state.scopeKind === kind
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>

        {state.scopeKind === "dataset" ? (
          <Select
            value={datasetId}
            onValueChange={onDatasetChange}
            disabled={scopeLoading || datasets.length === 0}
          >
            <SelectTrigger className="w-56" aria-label="Dataset scope">
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
            onValueChange={onDocumentChange}
            disabled={scopeLoading || documents.length === 0}
          >
            <SelectTrigger className="w-64" aria-label="Document scope">
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

        <Select value={state.entityType} onValueChange={onEntityTypeChange}>
          <SelectTrigger className="w-48" aria-label="Entity type filter">
            <SelectValue placeholder="All entity types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {GRAPH_ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {formatGraphLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600">
          <input
            type="checkbox"
            checked={state.includeExcluded}
            onChange={(event) => onIncludeExcludedChange(event.target.checked)}
            className="size-3.5 rounded border-gray-300 accent-indigo-600"
          />
          Include excluded
        </label>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copy link to this view"
            title="Copy link to this view"
            onClick={() =>
              copyText(window.location.href, "Link to this view copied")
            }
          >
            <Link2 />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Refresh knowledge graph"
            title="Refresh"
            disabled={!hasScope || entitiesLoading}
            onClick={onRefresh}
          >
            {entitiesLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-gray-50 pt-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Filters
          </span>
          {activeFilters.map((filter) => (
            <span
              key={filter.key}
              className="inline-flex max-w-64 items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
            >
              <span className="text-indigo-400">{filter.label}:</span>
              <span className="truncate">
                {filter.key === "entityType"
                  ? formatGraphLabel(filter.value)
                  : filter.value}
              </span>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearFilters}
            className="ml-1 text-[11px] font-semibold text-gray-500 transition-colors hover:text-gray-800"
          >
            Clear filters
          </button>
        </div>
      )}

      {scopeError && <p className="mt-2 text-xs text-red-600">{scopeError}</p>}
      {!scopeLoading && !hasScope && !scopeError && (
        <p className="mt-2 text-xs text-amber-700">
          No accessible {state.scopeKind === "dataset" ? "dataset" : "document"}{" "}
          is available for graph exploration.
        </p>
      )}
    </section>
  );
}
