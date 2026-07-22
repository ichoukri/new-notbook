import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CheckSquare,
  FileText,
  Layers,
  Loader2,
  MinusSquare,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ingestion/ui";
import { cn } from "@/lib/utils";
import type {
  TChunkEditOperation,
  TIngestionChunk,
} from "@/core/ingestions";
import {
  type SplitBlock,
  buildChunkPreview,
  buildChunkSplitPlan,
  opTouches,
} from "./chunk-preview";
import { ChunkImagePreviewDialog } from "./chunk-image-preview-dialog";
import { ChunkReviewRow } from "./chunk-review-row";
import { ChunkSourcePane } from "./chunk-source-pane";
import { ReviewFilterBar } from "./review-filter-bar";

export function ChunkReview({
  chunks,
  isLoading,
  stage,
  documentId,
  canPreviewSource = false,
  onSubmitEdits,
  isSubmitting,
  disabled,
  onPendingChange,
}: {
  chunks: TIngestionChunk[];
  isLoading: boolean;
  stage: string;
  documentId?: string;
  /** Only PDFs can be shown beside the list. */
  canPreviewSource?: boolean;
  onSubmitEdits: (operations: TChunkEditOperation[]) => void;
  isSubmitting: boolean;
  disabled: boolean;
  onPendingChange?: (count: number) => void;
}) {
  const showSummary = stage !== "chunking";

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingOps, setPendingOps] = useState<TChunkEditOperation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [splittingId, setSplittingId] = useState<string | null>(null);
  const [splitAfter, setSplitAfter] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // The source pane is opt-in: the list already carries filters, bulk select and
  // per-row editors, so forcing two columns would cramp a laptop screen.
  const [showSource, setShowSource] = useState(false);
  // Keyed by preview row key, not server id: applying edits replaces chunks
  // with new rows at a new version, so a server id would go stale instantly.
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange?.(pendingOps.length);
    return () => onPendingChange?.(0);
  }, [pendingOps.length, onPendingChange]);

  const previewChunks = useMemo(
    () => buildChunkPreview(chunks, pendingOps, showSummary),
    [chunks, pendingOps, showSummary],
  );

  const resetModes = () => {
    setEditingId(null);
    setEditDraft("");
    setSplittingId(null);
    setSplitAfter(new Set());
  };

  const stageOp = (op: TChunkEditOperation, ids: string[]) =>
    setPendingOps((prev) => [
      ...prev.filter((existing) => !ids.some((id) => opTouches(existing, id))),
      op,
    ]);

  const startEdit = (serverId: string, content: string) => {
    resetModes();
    setEditingId(serverId);
    setEditDraft(content);
  };

  const saveEdit = (serverId: string) => {
    if (!editDraft.trim()) {
      resetModes();
      return;
    }
    stageOp(
      showSummary
        ? { op: "edit", chunk_id: serverId, summary_content: editDraft }
        : { op: "edit", chunk_id: serverId, text_content: editDraft },
      [serverId],
    );
    resetModes();
  };

  const startSplit = (serverId: string) => {
    resetModes();
    setSplittingId(serverId);
  };

  const toggleSplitAt = (blockIndex: number) =>
    setSplitAfter((prev) => {
      const next = new Set(prev);
      if (next.has(blockIndex)) next.delete(blockIndex);
      else next.add(blockIndex);
      return next;
    });

  const confirmSplit = (serverId: string, blocks: SplitBlock[]) => {
    const plan = buildChunkSplitPlan(blocks, splitAfter);
    if (!plan) {
      toast.error("Choose a split that leaves content in every chunk.");
      return;
    }

    stageOp(
      {
        op: "split",
        chunk_id: serverId,
        segments: plan.segments,
        image_segments: plan.imageSegments,
      },
      [serverId],
    );
    resetModes();
  };

  const deleteChunk = (serverId: string) =>
    stageOp({ op: "delete", chunk_id: serverId }, [serverId]);

  const undoChunk = (serverId: string) =>
    setPendingOps((prev) => prev.filter((op) => !opTouches(op, serverId)));

  const mergeRows = (firstId: string, secondId: string) =>
    stageOp({ op: "merge", chunk_ids: [firstId, secondId] }, [
      firstId,
      secondId,
    ]);

  const toggleSelect = (serverId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(serverId)) next.delete(serverId);
      else next.add(serverId);
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const deleteSelected = (deletedServerIds: Set<string>) => {
    if (busy || selectedIds.size === 0) return;
    const willDelete = new Set([...deletedServerIds, ...selectedIds]);
    if (willDelete.size >= chunks.length) {
      toast.error("At least one chunk must remain.");
      return;
    }
    const ids = [...selectedIds];
    setPendingOps((prev) => [
      ...prev.filter((op) => !ids.some((id) => opTouches(op, id))),
      ...ids.map(
        (id): TChunkEditOperation => ({ op: "delete", chunk_id: id }),
      ),
    ]);
    clearSelection();
  };

  const applyAll = () => {
    if (pendingOps.length === 0 || isSubmitting) return;
    resetModes();
    onSubmitEdits(pendingOps);
  };

  const discardAll = () => {
    resetModes();
    setPendingOps([]);
  };

  if (isLoading) {
    return (
      <Panel icon={Layers} title="Chunks">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading chunks…
        </div>
      </Panel>
    );
  }

  if (chunks.length === 0) {
    return (
      <Panel icon={Layers} title="Chunks">
        <p className="text-sm text-gray-500">No chunks available yet.</p>
      </Panel>
    );
  }

  const busy = isSubmitting || disabled;
  const hasPending = pendingOps.length > 0;
  const sourceAvailable = Boolean(documentId) && canPreviewSource;
  const editorOpen = editingId !== null || splittingId !== null;

  const typeOptions = [
    ...new Set(previewChunks.flatMap((row) => row.contentTypes)),
  ].sort();
  const pageOptions = [
    ...new Set(
      previewChunks
        .map((row) => row.pageNumber)
        .filter((page): page is number => page != null),
    ),
  ].sort((a, b) => a - b);

  const query = search.trim().toLowerCase();
  const filtersActive =
    query !== "" || typeFilter !== "all" || pageFilter !== "all";
  const visibleChunks = filtersActive
    ? previewChunks.filter((row) => {
        if (typeFilter !== "all" && !row.contentTypes.includes(typeFilter)) {
          return false;
        }
        if (pageFilter !== "all" && String(row.pageNumber) !== pageFilter) {
          return false;
        }
        if (query && !row.content.toLowerCase().includes(query)) return false;
        return true;
      })
    : previewChunks;

  // Selection: only real, not-yet-deleted server chunks are selectable.
  const selectableIds = visibleChunks
    .filter((row) => row.serverId != null && row.status !== "deleted")
    .map((row) => row.serverId as string);
  const selectedVisibleCount = selectableIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const allVisibleSelected =
    selectableIds.length > 0 && selectedVisibleCount === selectableIds.length;
  const deletedServerIds = new Set(
    previewChunks
      .filter((row) => row.status === "deleted" && row.serverId != null)
      .map((row) => row.serverId as string),
  );

  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });

  return (
    <>
      <Panel
        icon={Layers}
        title={showSummary ? "Chunk summaries" : "Chunk content"}
        subtitle={`${previewChunks.filter((row) => row.status !== "deleted").length} chunks · version ${chunks[0]?.chunkVersion}`}
        actions={
          <div className="flex items-center gap-2">
            {sourceAvailable && (
              <Button
                size="sm"
                variant={showSource ? "default" : "outline"}
                onClick={() => setShowSource((open) => !open)}
                title="Show the source PDF beside the chunk list"
              >
                <FileText className="mr-1.5 size-3.5" />
                {showSource ? "Hide source" : "Show source"}
              </Button>
            )}
            {hasPending ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-violet-600">
                {pendingOps.length} pending change
                {pendingOps.length === 1 ? "" : "s"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={discardAll}
                disabled={busy}
              >
                Discard
              </Button>
              <Button size="sm" onClick={applyAll} disabled={busy}>
                {isSubmitting ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                )}
                Apply
              </Button>
            </div>
            ) : null}
          </div>
        }
        bodyClassName=""
      >
        <div className="border-b border-violet-100 bg-violet-50/60 px-5 py-2.5 text-xs text-violet-700">
          {hasPending ? (
            <>
              Previewing staged changes. <strong>Apply</strong> to rebuild the
              chunk version and re-run summarisation &amp; vectorisation, or{" "}
              <strong>Discard</strong> to revert. Approve is disabled until you
              apply.
            </>
          ) : (
            <>
              Refine the chunks below - <strong>edit</strong> text,{" "}
              <strong>split</strong> a chunk into parts, <strong>merge</strong>{" "}
              a chunk with its neighbour, or <strong>delete</strong> one.
              Changes preview here and only persist when you Apply.
            </>
          )}
        </div>

        <ReviewFilterBar
          search={search}
          onSearch={setSearch}
          typeLabel="content"
          typeValue={typeFilter}
          onType={setTypeFilter}
          typeOptions={typeOptions}
          pageValue={pageFilter}
          onPage={setPageFilter}
          pageOptions={pageOptions}
          resultCount={visibleChunks.length}
          totalCount={previewChunks.length}
        />

        {visibleChunks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No chunks match your filters.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/40 px-5 py-2 text-xs">
              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={busy || selectableIds.length === 0}
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
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {selectedIds.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSelected(deletedServerIds)}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" /> Delete {selectedIds.size}
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
            <div
              className={cn(
                showSource && sourceAvailable
                  ? "grid gap-0 xl:grid-cols-2"
                  : "",
              )}
            >
            <div className="max-h-[600px] overflow-y-auto py-1">
              {visibleChunks.map((row, index) => (
                <ChunkReviewRow
                  key={row.key}
                  row={row}
                  next={visibleChunks[index + 1]}
                  busy={busy}
                  editorOpen={editorOpen}
                  filtersActive={filtersActive}
                  isEditing={row.serverId != null && editingId === row.serverId}
                  isSplitting={
                    row.serverId != null && splittingId === row.serverId
                  }
                  editDraft={editDraft}
                  splitAfter={splitAfter}
                  onEditDraftChange={setEditDraft}
                  onStartEdit={startEdit}
                  onStartSplit={startSplit}
                  onDelete={deleteChunk}
                  onUndo={undoChunk}
                  onCancelMode={resetModes}
                  onSaveEdit={saveEdit}
                  onToggleSplitAt={toggleSplitAt}
                  onConfirmSplit={confirmSplit}
                  onMerge={mergeRows}
                  onPreviewImage={setPreviewImage}
                  selectable={
                    row.serverId != null && row.status !== "deleted"
                  }
                  isSelected={
                    row.serverId != null && selectedIds.has(row.serverId)
                  }
                  onToggleSelect={toggleSelect}
                  onFocus={
                    showSource && sourceAvailable ? setFocusedKey : undefined
                  }
                  isFocused={focusedKey === row.key}
                />
              ))}
            </div>

            {showSource && sourceAvailable && documentId && (
              <div className="h-[600px] border-t border-gray-100 xl:border-l xl:border-t-0">
                <ChunkSourcePane
                  documentId={documentId}
                  rows={previewChunks}
                  focusedKey={focusedKey}
                  onFocusRow={setFocusedKey}
                />
              </div>
            )}
            </div>
          </>
        )}
      </Panel>

      <ChunkImagePreviewDialog
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}
