import {
  AlertTriangle,
  Ban,
  ExternalLink,
  FilePenLine,
  FileText,
  GitMerge,
  Loader2,
  Network,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceLocationSummary } from "@/components/app/source-location-summary";
import {
  formatGraphLabel,
  type TGraphCitation,
  type TGraphEntity,
  type TGraphNeighborhood,
} from "@/core/knowledge-graph";
import { cn } from "@/lib/utils";
import {
  formatConfidence,
  getEntityName,
  type TGraphErrorState,
} from "./graph-explorer-utils";

type NeighborhoodPanelProps = {
  selectedEntity: TGraphEntity | null;
  neighborhood: TGraphNeighborhood | null;
  depth: 1 | 2;
  isLoading: boolean;
  error: TGraphErrorState | null;
  onDepthChange: (depth: 1 | 2) => void;
  onSelectEntity: (canonicalId: string) => void;
  onOpenDocument: (documentId: string) => void;
  onRetry: () => void;
  onEdit: () => void;
  onMerge: () => void;
  onExclude: () => void;
};

function CitationCard({
  citation,
  onOpenDocument,
}: {
  citation: TGraphCitation;
  onOpenDocument: (documentId: string) => void;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-gray-800">
            {citation.documentName}
          </p>
          <SourceLocationSummary
            paths={citation.sourceRelativePaths}
            className="mt-1"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Open ${citation.documentName}`}
          title="Open source document"
          onClick={() => onOpenDocument(citation.documentId)}
        >
          <ExternalLink className="size-3.5" />
        </Button>
      </div>
      <blockquote className="mt-2 border-l-2 border-indigo-200 pl-2 text-xs leading-relaxed text-gray-600">
        {citation.evidenceText || "No evidence excerpt is available."}
      </blockquote>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-gray-500">
        {citation.pageNumber !== null && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5">
            Page {citation.pageNumber}
          </span>
        )}
        <span className="rounded bg-gray-100 px-1.5 py-0.5">
          Chunk {citation.chunkIndex}
        </span>
        <span
          className="max-w-32 truncate rounded bg-gray-100 px-1.5 py-0.5 font-mono"
          title={citation.graphInputHash}
        >
          {citation.graphInputHash}
        </span>
      </div>
    </article>
  );
}

export function NeighborhoodPanel({
  selectedEntity,
  neighborhood,
  depth,
  isLoading,
  error,
  onDepthChange,
  onSelectEntity,
  onOpenDocument,
  onRetry,
  onEdit,
  onMerge,
  onExclude,
}: NeighborhoodPanelProps) {
  if (!selectedEntity) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
        <div className="max-w-sm px-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-indigo-50">
            <Network className="size-5 text-indigo-500" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">
            Select an entity to explore
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Relationships stay bounded to one or two hops and always retain their
            source evidence.
          </p>
        </div>
      </section>
    );
  }

  const center =
    neighborhood?.nodes.find(
      (node) => node.canonicalId === neighborhood.centerId,
    ) ?? selectedEntity;
  const citationsById = new Map(
    neighborhood?.citations.map((citation) => [citation.id, citation]) ?? [],
  );
  const canCurate = !center.excluded && !center.mergedInto;

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-gray-900">
                {center.name}
              </h2>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                {formatGraphLabel(center.entityType)}
              </span>
              {center.excluded && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                  Excluded
                </span>
              )}
              {center.mergedInto && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  Merged
                </span>
              )}
            </div>
            <p className="mt-1 break-all font-mono text-[10px] text-gray-400">
              {center.canonicalId}
            </p>
            {center.description && (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
                {center.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{formatConfidence(center.confidence)} confidence</span>
              <span>{center.supportingDocumentCount} supporting documents</span>
              <span>{center.evidenceCount} evidence records</span>
              {center.aliases.length > 0 && (
                <span>Aliases: {center.aliases.join(", ")}</span>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!canCurate}
              onClick={onEdit}
            >
              <FilePenLine className="size-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!canCurate}
              onClick={onMerge}
            >
              <GitMerge className="size-3.5" />
              Merge
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={!canCurate}
              onClick={onExclude}
            >
              <Ban className="size-3.5" />
              Exclude
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-50 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Neighborhood</span>
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {([1, 2] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onDepthChange(value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    depth === value
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  {value} hop{value === 2 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>
          {neighborhood && (
            <p className="text-[11px] text-gray-500">
              {neighborhood.nodes.length} nodes · {neighborhood.edges.length}{" "}
              relations · {neighborhood.citations.length} citations
            </p>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin text-indigo-500" />
          Loading bounded neighborhood…
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
            <AlertTriangle className="mx-auto size-5 text-amber-600" />
            <h3 className="mt-2 text-sm font-semibold text-amber-900">
              {error.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              {error.message}
            </p>
            {error.retryable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onRetry}
              >
                Try again
              </Button>
            )}
          </div>
        </div>
      ) : neighborhood ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] divide-x divide-gray-100 overflow-hidden">
          <div className="min-h-0 overflow-y-auto p-4">
            {neighborhood.truncated && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0" />
                This view reached its safety limit. Narrow the scope or use one hop
                to inspect a smaller neighborhood.
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Connected entities
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {neighborhood.nodes.map((node) => (
                  <button
                    key={node.canonicalId}
                    type="button"
                    onClick={() => onSelectEntity(node.canonicalId)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left transition-colors",
                      node.canonicalId === neighborhood.centerId
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50",
                    )}
                  >
                    <span className="block max-w-48 truncate text-xs font-semibold text-gray-800">
                      {node.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-gray-500">
                      {formatGraphLabel(node.entityType)} ·{" "}
                      {node.supportingDocumentIds.length} docs
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Evidence-backed relations
              </h3>
              <div className="mt-2 space-y-2">
                {neighborhood.edges.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-xs text-gray-500">
                    No relationships were found inside this bounded scope.
                  </div>
                )}
                {neighborhood.edges.map((edge) => {
                  const edgeCitations = edge.citationIds
                    .map((id) => citationsById.get(id))
                    .filter((citation): citation is TGraphCitation => Boolean(citation));
                  return (
                    <article
                      key={edge.id}
                      className="rounded-xl border border-gray-200 bg-gray-50/60 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          className="max-w-52 truncate font-semibold text-gray-800 hover:text-indigo-700"
                          onClick={() => onSelectEntity(edge.sourceCanonicalId)}
                        >
                          {getEntityName(edge.sourceCanonicalId, neighborhood.nodes)}
                        </button>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                          {formatGraphLabel(edge.relationType)}
                        </span>
                        <button
                          type="button"
                          className="max-w-52 truncate font-semibold text-gray-800 hover:text-indigo-700"
                          onClick={() => onSelectEntity(edge.targetCanonicalId)}
                        >
                          {getEntityName(edge.targetCanonicalId, neighborhood.nodes)}
                        </button>
                        <span className="ml-auto text-[10px] text-gray-500">
                          {formatConfidence(edge.confidence)}
                        </span>
                      </div>
                      {edge.description && (
                        <p className="mt-2 text-xs leading-relaxed text-gray-600">
                          {edge.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-500">
                        <Quote className="size-3" />
                        {edgeCitations.length} source citation
                        {edgeCitations.length === 1 ? "" : "s"}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto bg-gray-50/50 p-4">
            <div className="flex items-center gap-2">
              <FileText className="size-3.5 text-indigo-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Source evidence
              </h3>
            </div>
            <div className="mt-3 space-y-2.5">
              {neighborhood.citations.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-500">
                  No citations were returned for this neighborhood.
                </div>
              )}
              {neighborhood.citations.map((citation) => (
                <CitationCard
                  key={citation.id}
                  citation={citation}
                  onOpenDocument={onOpenDocument}
                />
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
