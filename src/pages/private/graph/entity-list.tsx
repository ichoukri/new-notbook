import { useRef, type KeyboardEvent } from "react";
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
  onSelect: (canonicalId: string, options?: { replace?: boolean }) => void;
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
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + entities.length, total);
  const isInitialLoad = isLoading && entities.length === 0;

  // Arrow keys walk the list the way a mail client does: selection follows
  // focus, so the neighborhood updates as you move.
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = entities.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") nextIndex = Math.min(index + 1, lastIndex);
    else if (event.key === "ArrowUp") nextIndex = Math.max(index - 1, 0);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex === null || nextIndex === index) return;

    event.preventDefault();
    const nextEntity = entities[nextIndex];
    if (!nextEntity) return;

    // Arrow browsing is transient — it must not push a history entry per
    // keystroke, or the back button becomes useless.
    onSelect(nextEntity.canonicalId, { replace: true });
    itemRefs.current[nextIndex]?.focus();
  };

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
        {isInitialLoad && <EntityListSkeleton />}

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

        <div
          className={cn(
            "space-y-1.5 transition-opacity",
            // Keep the previous page readable while the next one loads, but
            // make it obvious it is stale.
            isLoading && entities.length > 0 && "pointer-events-none opacity-50",
          )}
        >
          {entities.map((entity, index) => {
            const selected = entity.canonicalId === selectedId;
            return (
              <button
                key={entity.canonicalId}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                aria-current={selected}
                onClick={() => onSelect(entity.canonicalId)}
                onKeyDown={(event) => handleKeyDown(event, index)}
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

function EntityListSkeleton() {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-transparent px-3 py-3"
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 size-8 shrink-0 animate-pulse rounded-lg bg-gray-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
              <div className="h-2.5 w-full animate-pulse rounded bg-gray-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
