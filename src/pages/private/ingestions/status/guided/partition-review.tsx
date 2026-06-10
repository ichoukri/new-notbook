import { FileText, Layers, Loader2, Trash2, Undo2 } from "lucide-react";
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
              />
              {filteredElements.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">
                  No elements match your filters.
                </p>
              ) : (
                <div className="max-h-[600px] divide-y divide-gray-100 overflow-y-auto">
                  {filteredElements.map((element) => {
                    const isRemoved = removed.has(element.index);
                    return (
                      <div
                        key={element.index}
                        className={cn(
                          "flex gap-3 px-5 py-3.5 transition-colors",
                          isRemoved && "bg-red-50/50",
                        )}
                      >
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
