import {
  CheckSquare,
  CopyCheck,
  FileText,
  Layers,
  Loader2,
  MinusSquare,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableHtml } from "@/components/app/table-html";
import { MotionItem, MotionStack, Panel } from "@/components/ingestion/ui";
import { buildChunkAssetUrl } from "@/core/api";
import { cn } from "@/lib/utils";
import { parsePartitionElements } from "./partition-elements";
import { ReviewFilterBar } from "./review-filter-bar";

export function PartitionReview({
  output,
  onSaveRemovals,
  isSaving,
  disabled,
}: {
  output: Record<string, unknown> | null;
  onSaveRemovals: (removedIndices: number[]) => void;
  isSaving: boolean;
  disabled: boolean;
}) {
  const elements = parsePartitionElements(output?.elements);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Set from a row's "N identical" badge to narrow the list to one duplicate
  // set, so a bulk removal can be eyeballed before it happens.
  const [duplicateFilter, setDuplicateFilter] = useState<string | null>(null);

  const typeOptions = [...new Set(elements.map((element) => element.type))].sort();
  const pageOptions = [
    ...new Set(
      elements
        .map((element) => element.page)
        .filter((page): page is number => page != null),
    ),
  ].sort((a, b) => a - b);

  const query = search.trim().toLowerCase();
  const filteredElements = elements.filter((element) => {
    if (typeFilter !== "all" && element.type !== typeFilter) return false;
    if (pageFilter !== "all" && String(element.page) !== pageFilter) return false;
    if (duplicateFilter && element.duplicate_group_id !== duplicateFilter) {
      return false;
    }
    if (
      query &&
      !element.preview.toLowerCase().includes(query) &&
      !element.type.toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });
  const removed = new Set(
    Array.isArray(output?.removed_indices)
      ? (output?.removed_indices as unknown[]).filter(
          (value): value is number => typeof value === "number",
        )
      : [],
  );

  const busy = isSaving || disabled;

  // Near-identical images (a logo repeated on every page, say) share a
  // duplicate_group_id. Grouping spans every element, not just the visible
  // rows, so selecting a set never requires scrolling to each page it sits on.
  const duplicateGroups = new Map<string, number[]>();
  for (const element of elements) {
    if (!element.duplicate_group_id) continue;
    const members = duplicateGroups.get(element.duplicate_group_id);
    if (members) members.push(element.index);
    else duplicateGroups.set(element.duplicate_group_id, [element.index]);
  }

  // Already-removed members are skipped so the count on the button matches
  // what pressing it actually selects.
  const selectableDuplicates = (groupId: string) =>
    (duplicateGroups.get(groupId) ?? []).filter((index) => !removed.has(index));

  const selectDuplicates = (groupId: string) => {
    if (busy) return;
    const members = selectableDuplicates(groupId);
    if (members.length === 0) return;
    setSelected((prev) => new Set([...prev, ...members]));
  };

  const toggleDuplicateFilter = (groupId: string) =>
    setDuplicateFilter((current) => (current === groupId ? null : groupId));

  const toggle = (index: number) => {
    if (busy) return;
    const next = new Set(removed);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    if (next.size >= elements.length) {
      toast.error("At least one element must remain.");
      return;
    }
    onSaveRemovals([...next].sort((a, b) => a - b));
  };

  // Selection operates on the currently-visible (filtered) elements.
  const visibleIndices = filteredElements.map((element) => element.index);
  const selectedVisibleCount = visibleIndices.filter((index) =>
    selected.has(index),
  ).length;
  const allVisibleSelected =
    visibleIndices.length > 0 && selectedVisibleCount === visibleIndices.length;

  const toggleSelect = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIndices.forEach((index) => next.delete(index));
      } else {
        visibleIndices.forEach((index) => next.add(index));
      }
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const removeSelected = () => {
    if (busy || selected.size === 0) return;
    const next = new Set(removed);
    selected.forEach((index) => next.add(index));
    if (next.size >= elements.length) {
      toast.error("At least one element must remain.");
      return;
    }
    onSaveRemovals([...next].sort((a, b) => a - b));
    clearSelection();
  };

  const keepSelected = () => {
    if (busy || selected.size === 0) return;
    const next = new Set(removed);
    selected.forEach((index) => next.delete(index));
    onSaveRemovals([...next].sort((a, b) => a - b));
    clearSelection();
  };

  if (!output) {
    return (
      <Panel icon={Layers} title="Extracted structure">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading partition output…
        </div>
      </Panel>
    );
  }

  const elementsFound = output.elements_found;
  const counts =
    elementsFound && typeof elementsFound === "object"
      ? Object.entries(elementsFound as Record<string, unknown>)
          .map(([key, value]) => [key, Number(value) || 0] as const)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
      : [];

  return (
    <>
      <MotionStack className="space-y-5">
        {counts.length > 0 && (
          <MotionItem>
            <Panel icon={Layers} title="Extracted structure">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {counts.map(([type, count]) => (
                  <div
                    key={type}
                    className="rounded-xl bg-gray-50 px-4 py-3 text-center"
                  >
                    <p className="text-2xl font-bold tabular-nums text-gray-900">
                      {count}
                    </p>
                    <p className="mt-1 text-xs capitalize text-gray-500">
                      {type}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </MotionItem>
        )}

        <MotionItem>
          {elements.length === 0 ? (
            <Panel icon={FileText} title="Extracted elements">
              <p className="text-sm text-gray-500">
                No per-element preview is available for this document.
              </p>
            </Panel>
          ) : (
            <Panel
              icon={FileText}
              title="Extracted elements"
              subtitle="Remove anything you don't want chunked"
              actions={
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  {removed.size > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                      {removed.size} removed
                    </span>
                  )}
                  {elements.length} total
                  {isSaving && (
                    <Loader2 className="size-4 animate-spin text-violet-500" />
                  )}
                </span>
              }
              bodyClassName=""
            >
              <ReviewFilterBar
                search={search}
                onSearch={setSearch}
                typeLabel="types"
                typeValue={typeFilter}
                onType={setTypeFilter}
                typeOptions={typeOptions}
                pageValue={pageFilter}
                onPage={setPageFilter}
                pageOptions={pageOptions}
                resultCount={filteredElements.length}
                totalCount={elements.length}
                extraFilter={
                  duplicateFilter
                    ? {
                        label: `${
                          duplicateGroups.get(duplicateFilter)?.length ?? 0
                        } identical images`,
                        onClear: () => setDuplicateFilter(null),
                      }
                    : null
                }
              />
              {filteredElements.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">
                  No elements match your filters.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/40 px-5 py-2 text-xs">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      disabled={busy || visibleIndices.length === 0}
                      className="flex items-center gap-1.5 font-medium text-gray-600 transition-colors hover:text-violet-700 disabled:opacity-40"
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="size-4 text-violet-600" />
                      ) : selectedVisibleCount > 0 ? (
                        <MinusSquare className="size-4 text-violet-600" />
                      ) : (
                        <Square className="size-4 text-gray-400" />
                      )}
                      Select all
                    </button>
                    {selected.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {selected.size} selected
                        </span>
                        <button
                          type="button"
                          onClick={keepSelected}
                          disabled={busy}
                          className="rounded-lg px-2 py-1 font-medium text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          onClick={removeSelected}
                          disabled={busy}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
                        >
                          <Trash2 className="size-3.5" /> Remove {selected.size}
                        </button>
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="text-gray-400 transition-colors hover:text-gray-600"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="max-h-[600px] divide-y divide-gray-100 overflow-y-auto">
                  {filteredElements.map((element) => {
                    const isRemoved = removed.has(element.index);
                    const isSelected = selected.has(element.index);
                    const groupId = element.duplicate_group_id;
                    const duplicateCount = groupId
                      ? (duplicateGroups.get(groupId)?.length ?? 0)
                      : 0;
                    const pendingDuplicates = groupId
                      ? selectableDuplicates(groupId).filter(
                          (index) => !selected.has(index),
                        ).length
                      : 0;
                    const isGroupFiltered =
                      groupId != null && duplicateFilter === groupId;
                    return (
                      <div
                        key={element.index}
                        className={cn(
                          "flex gap-3 px-5 py-3.5 transition-colors",
                          isRemoved && "bg-red-50/50",
                          isSelected && !isRemoved && "bg-violet-50/40",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSelect(element.index)}
                          disabled={busy}
                          className="flex h-fit items-center self-start pt-0.5 text-gray-300 transition-colors hover:text-violet-600 disabled:opacity-40"
                          title={isSelected ? "Deselect" : "Select"}
                        >
                          {isSelected ? (
                            <CheckSquare className="size-4 text-violet-600" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono">#{element.index}</span>
                            <span className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                              {element.type}
                            </span>
                            {element.page != null && (
                              <span className="rounded bg-gray-100 px-2 py-0.5">
                                page {element.page}
                              </span>
                            )}
                            <span>{element.char_count} chars</span>
                            {element.has_table && (
                              <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                                table
                              </span>
                            )}
                            {element.has_image && (
                              <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                                image
                              </span>
                            )}
                            {groupId && duplicateCount > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleDuplicateFilter(groupId)}
                                  className={cn(
                                    "rounded px-2 py-0.5 transition-colors",
                                    isGroupFiltered
                                      ? "bg-sky-600 text-white"
                                      : "bg-sky-50 text-sky-700 hover:bg-sky-100",
                                  )}
                                  title={
                                    isGroupFiltered
                                      ? "Show all elements again"
                                      : `Show only these ${duplicateCount} images`
                                  }
                                >
                                  {duplicateCount} identical
                                </button>
                                {pendingDuplicates > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => selectDuplicates(groupId)}
                                    disabled={busy}
                                    className="flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-40"
                                    title={`Select the ${pendingDuplicates} matching image${
                                      pendingDuplicates === 1 ? "" : "s"
                                    } wherever they appear`}
                                  >
                                    <CopyCheck className="size-3.5" />
                                    Select all {duplicateCount} in document
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          {!element.table_html && (
                            <p
                              className={cn(
                                "whitespace-pre-wrap text-sm leading-relaxed",
                                isRemoved
                                  ? "text-gray-400 line-through"
                                  : "text-gray-800",
                              )}
                            >
                              {element.preview || (
                                <span className="italic text-gray-400">
                                  (no text content)
                                </span>
                              )}
                            </p>
                          )}
                          {element.image_path && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage(
                                  buildChunkAssetUrl(element.image_path as string),
                                )
                              }
                              className={cn(
                                "mt-2 block w-fit cursor-zoom-in overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:border-violet-400",
                                isRemoved && "opacity-50",
                              )}
                              title="Click to preview"
                            >
                              <img
                                src={buildChunkAssetUrl(element.image_path)}
                                alt={`element ${element.index} image`}
                                crossOrigin="use-credentials"
                                loading="lazy"
                                className="max-h-64 w-auto max-w-full object-contain"
                              />
                            </button>
                          )}
                          {element.table_html && (
                            <div
                              className={cn(
                                "mt-2 overflow-x-auto",
                                isRemoved && "opacity-50",
                              )}
                            >
                              <TableHtml html={element.table_html} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(element.index)}
                          disabled={busy}
                          className={cn(
                            "flex h-fit items-center gap-1 self-start rounded-lg px-2 py-1 text-xs transition-colors disabled:opacity-50",
                            isRemoved
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-gray-400 hover:bg-red-50 hover:text-red-600",
                          )}
                          title={
                            isRemoved ? "Keep this element" : "Remove this element"
                          }
                        >
                          {isRemoved ? (
                            <>
                              <Undo2 className="size-3.5" /> Keep
                            </>
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
            </Panel>
          )}
        </MotionItem>
      </MotionStack>

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      >
        <DialogContent className="max-w-[90vw] border-0 bg-transparent p-0 shadow-none sm:max-w-3xl">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {previewImage && (
            <img
              src={previewImage}
              alt="Extracted element preview"
              crossOrigin="use-credentials"
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
