import { Fragment } from "react";
import {
  GitMerge,
  Pencil,
  Plus,
  Save,
  Scissors,
  Trash2,
  Undo2,
} from "lucide-react";
import { MarkdownContent } from "@/components/app/markdown";
import { Button } from "@/components/ui/button";
import { buildChunkAssetUrl } from "@/core/api";
import { cn } from "@/lib/utils";
import {
  PREVIEW_STATUS_BADGE,
  type PreviewChunk,
  type SplitBlock,
  buildSplitBlocks,
} from "./chunk-preview";

type ChunkReviewRowProps = {
  row: PreviewChunk;
  next: PreviewChunk | undefined;
  busy: boolean;
  editorOpen: boolean;
  filtersActive: boolean;
  isEditing: boolean;
  isSplitting: boolean;
  editDraft: string;
  splitAfter: Set<number>;
  onEditDraftChange: (draft: string) => void;
  onStartEdit: (serverId: string, content: string) => void;
  onStartSplit: (serverId: string) => void;
  onDelete: (serverId: string) => void;
  onUndo: (serverId: string) => void;
  onCancelMode: () => void;
  onSaveEdit: (serverId: string) => void;
  onToggleSplitAt: (blockIndex: number) => void;
  onConfirmSplit: (serverId: string, blocks: SplitBlock[]) => void;
  onMerge: (firstId: string, secondId: string) => void;
  onPreviewImage: (imageUrl: string) => void;
};

export function ChunkReviewRow({
  row,
  next,
  busy,
  editorOpen,
  filtersActive,
  isEditing,
  isSplitting,
  editDraft,
  splitAfter,
  onEditDraftChange,
  onStartEdit,
  onStartSplit,
  onDelete,
  onUndo,
  onCancelMode,
  onSaveEdit,
  onToggleSplitAt,
  onConfirmSplit,
  onMerge,
  onPreviewImage,
}: ChunkReviewRowProps) {
  const isDeleted = row.status === "deleted";
  const canAct = row.serverId != null && !isDeleted;
  const badge =
    row.status === "unchanged" ? null : PREVIEW_STATUS_BADGE[row.status];
  const blocks = isSplitting
    ? buildSplitBlocks(row.content, row.imageUrls)
    : [];
  const splitCount = splitAfter.size + 1;
  const mergeableHere =
    !editorOpen &&
    !filtersActive &&
    row.status === "unchanged" &&
    row.serverId != null &&
    next?.status === "unchanged" &&
    next.serverId != null;

  return (
    <Fragment>
      <div
        className={cn(
          "group px-5 py-4",
          (isEditing || isSplitting) &&
            "rounded-xl bg-violet-50/40 ring-1 ring-violet-100",
          isDeleted && "opacity-60",
          (row.status === "added" || row.status === "merged") &&
            "border-l-2 border-emerald-300",
          row.status === "edited" && "border-l-2 border-violet-300",
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-mono">
            {row.displayIndex >= 0 ? `#${row.displayIndex}` : "removed"}
          </span>
          {badge && (
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          )}
          {row.pageNumber != null && (
            <span className="rounded bg-gray-100 px-2 py-0.5">
              page {row.pageNumber}
            </span>
          )}
          <span>{row.charCount} chars</span>
          {row.imageUrls.length > 0 && (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
              {row.imageUrls.length} image
              {row.imageUrls.length === 1 ? "" : "s"}
            </span>
          )}
          {row.contentTypes.map((contentType) => (
            <span
              key={contentType}
              className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700"
            >
              {contentType}
            </span>
          ))}

          {!isEditing && !isSplitting && (
            <span className="ml-auto flex items-center gap-1">
              {isDeleted ? (
                <button
                  type="button"
                  onClick={() => row.serverId && onUndo(row.serverId)}
                  disabled={busy}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                >
                  <Undo2 className="size-3.5" /> Undo
                </button>
              ) : canAct ? (
                <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() =>
                      row.serverId && onStartEdit(row.serverId, row.content)
                    }
                    disabled={busy || editorOpen}
                    className="rounded px-1.5 py-0.5 text-gray-400 hover:bg-gray-100 hover:text-violet-700 disabled:opacity-40"
                    title="Edit text"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => row.serverId && onStartSplit(row.serverId)}
                    disabled={busy || editorOpen}
                    className="rounded px-1.5 py-0.5 text-gray-400 hover:bg-gray-100 hover:text-violet-700 disabled:opacity-40"
                    title="Split this chunk"
                  >
                    <Scissors className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => row.serverId && onDelete(row.serverId)}
                    disabled={busy || editorOpen}
                    className="rounded px-1.5 py-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    title="Delete this chunk"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              ) : (
                <span className="text-[10px] italic text-gray-400">
                  apply to edit further
                </span>
              )}
            </span>
          )}
        </div>

        {isEditing && row.serverId ? (
          <div className="space-y-2">
            <textarea
              value={editDraft}
              onChange={(event) => onEditDraftChange(event.target.value)}
              disabled={busy}
              autoFocus
              rows={Math.min(16, Math.max(4, editDraft.split("\n").length + 1))}
              className="w-full resize-y rounded-lg border border-gray-200 p-3 font-mono text-sm leading-relaxed text-gray-800 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelMode}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onSaveEdit(row.serverId as string)}
                disabled={busy}
              >
                <Save className="mr-1.5 size-3.5" />
                Stage edit
              </Button>
            </div>
          </div>
        ) : isSplitting && row.serverId ? (
          <div className="space-y-2">
            <p className="text-[11px] text-violet-600">
              Click a gap to add a split point. Images and tables move as whole
              units. This chunk becomes <strong>{splitCount}</strong> chunk
              {splitCount === 1 ? "" : "s"}.
            </p>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-violet-200">
              {blocks.map((block, blockIndex) => (
                <Fragment key={blockIndex}>
                  {block.kind === "image" ? (
                    <div className="flex items-center gap-2 bg-amber-50/40 px-3 py-2">
                      <img
                        src={buildChunkAssetUrl(block.url)}
                        alt="chunk image"
                        crossOrigin="use-credentials"
                        loading="lazy"
                        className="size-16 rounded-md border border-gray-200 object-cover"
                      />
                      <span className="text-[11px] font-medium text-amber-700">
                        Image
                      </span>
                    </div>
                  ) : block.isTable ? (
                    <div className="overflow-x-auto bg-white px-3 py-2 text-sm text-gray-800">
                      <MarkdownContent content={block.text} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap bg-white px-3 py-2 text-sm leading-relaxed text-gray-800">
                      {block.text}
                    </div>
                  )}
                  {blockIndex < blocks.length - 1 && (
                    <button
                      type="button"
                      onClick={() => onToggleSplitAt(blockIndex)}
                      disabled={busy}
                      className={cn(
                        "flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-medium transition-colors",
                        splitAfter.has(blockIndex)
                          ? "bg-violet-600 text-white hover:bg-violet-700"
                          : "bg-violet-50 text-violet-500 hover:bg-violet-100",
                      )}
                    >
                      {splitAfter.has(blockIndex) ? (
                        <>
                          <Scissors className="size-3" /> Split here - click to
                          remove
                        </>
                      ) : (
                        <>
                          <Plus className="size-3" /> Split here
                        </>
                      )}
                    </button>
                  )}
                </Fragment>
              ))}
            </div>
            {blocks.length < 2 && (
              <p className="text-[11px] text-gray-400">
                This chunk has no internal boundaries to split on.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelMode}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onConfirmSplit(row.serverId as string, blocks)}
                disabled={busy || splitAfter.size === 0}
              >
                <Scissors className="mr-1.5 size-3.5" />
                Split into {splitCount}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "text-sm leading-relaxed",
                isDeleted ? "text-gray-400 line-through" : "text-gray-800",
              )}
            >
              {row.content ? (
                <MarkdownContent content={row.content} />
              ) : (
                <span className="italic text-gray-400">(empty)</span>
              )}
            </div>
            {row.imageUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {row.imageUrls.map((src, imageIndex) => (
                  <button
                    key={`${row.key}-img-${imageIndex}`}
                    type="button"
                    onClick={() => onPreviewImage(buildChunkAssetUrl(src))}
                    className="block size-28 cursor-zoom-in overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:border-violet-400"
                    title="Click to preview"
                  >
                    <img
                      src={buildChunkAssetUrl(src)}
                      alt={`chunk image ${imageIndex + 1}`}
                      crossOrigin="use-credentials"
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {mergeableHere && row.serverId && next?.serverId && (
        <div className="group/merge relative flex h-6 items-center justify-center">
          <div className="absolute inset-x-5 top-1/2 border-t border-dashed border-gray-200" />
          <button
            type="button"
            onClick={() => onMerge(row.serverId as string, next.serverId as string)}
            disabled={busy}
            className="relative z-10 flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-400 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-40 group-hover/merge:border-violet-200"
            title="Merge this chunk with the next"
          >
            <GitMerge className="size-3" />
            Merge
          </button>
        </div>
      )}
    </Fragment>
  );
}
