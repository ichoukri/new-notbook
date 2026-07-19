import {
  Ban,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TGraphEntity } from "@/core/knowledge-graph";
import { formatGraphLabel } from "@/core/knowledge-graph";
import { cn } from "@/lib/utils";
import { formatConfidence } from "./graph-explorer-utils";

type EntityListProps = {
  entities: TGraphEntity[];
  selectedId: string;
  total: number;
  offset: number;
  limit: number;
  isLoading: boolean;
  onSelect: (canonicalId: string) => void;
  onPageChange: (offset: number) => void;
};

export function EntityList({
  entities,
  selectedId,
  total,
  offset,
  limit,
  isLoading,
  onSelect,
  onPageChange,
}: EntityListProps) {
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + entities.length, total);

  return (
    <section className="flex min-h-0 w-[360px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Entities</h2>
          <p className="text-xs text-gray-500">{total.toLocaleString()} in scope</p>
        </div>
        {isLoading && <Loader2 className="size-4 animate-spin text-indigo-500" />}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!isLoading && entities.length === 0 && (
          <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 rounded-2xl bg-gray-100 p-3">
              <Network className="size-5 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No entities found</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Try a broader filter, or publish the guided knowledge-graph stage for
              documents in this scope.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          {entities.map((entity) => {
            const selected = entity.canonicalId === selectedId;
            return (
              <button
                key={entity.canonicalId}
                type="button"
                onClick={() => onSelect(entity.canonicalId)}
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-left transition-all",
                  selected
                    ? "border-indigo-200 bg-indigo-50 shadow-sm"
                    : "border-transparent hover:border-gray-200 hover:bg-gray-50",
                  entity.excluded && "opacity-65",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-lg",
                      selected
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {entity.excluded ? (
                      <Ban className="size-3.5" />
                    ) : (
                      <Network className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">
                        {entity.name}
                      </span>
                      {entity.excluded && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-600">
                          Excluded
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
                      <span className="rounded-full bg-white px-1.5 py-0.5 font-medium text-indigo-600 ring-1 ring-gray-200">
                        {formatGraphLabel(entity.entityType)}
                      </span>
                      <span>{formatConfidence(entity.confidence)}</span>
                      <span className="flex items-center gap-0.5">
                        <FileText className="size-3" />
                        {entity.supportingDocumentCount}
                      </span>
                      <span>{entity.evidenceCount} evidence</span>
                    </span>
                    {entity.description && (
                      <span className="mt-1.5 line-clamp-2 block text-xs leading-relaxed text-gray-500">
                        {entity.description}
                      </span>
                    )}
                    {entity.mergedInto && (
                      <span className="mt-1 block truncate text-[11px] text-amber-700">
                        Merged into {entity.mergedInto}
                      </span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5">
        <span className="text-[11px] text-gray-500">
          {start}-{end} of {total.toLocaleString()}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous entity page"
            disabled={offset === 0 || isLoading}
            onClick={() => onPageChange(Math.max(0, offset - limit))}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next entity page"
            disabled={offset + limit >= total || isLoading}
            onClick={() => onPageChange(offset + limit)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
