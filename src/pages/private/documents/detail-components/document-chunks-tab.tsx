import { ChevronDown, ChevronRight, Copy, Layers3, Loader2, Sparkles } from "lucide-react";
import { MarkdownContent } from "@/components/app/markdown";
import { TableHtml } from "@/components/app/table-html";
import { ContentTypeBadge } from "@/components/app/status-badge";
import { buildChunkAssetUrl } from "@/core/api";
import {
  getChunkEmbeddingMode,
  getChunkSectionTitle,
  getChunkTokenCount,
} from "@/core/documents";
import {
  getChunkImageUrls,
  getChunkTables,
  type TIngestionChunk,
} from "@/core/ingestions";
import { cn } from "@/lib/utils";
import { copyText } from "./copy-text";

export function DocumentChunksTab({
  chunks,
  expandedChunks,
  isLoadingChunks,
  onToggleChunk,
}: {
  chunks: TIngestionChunk[];
  expandedChunks: Set<string>;
  isLoadingChunks: boolean;
  onToggleChunk: (chunkId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Layers3 className="size-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-950">Stored chunks</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Expand a row to inspect summaries, source text, tables, and images.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold tabular-nums text-indigo-700">
          {chunks.length.toLocaleString()} total
        </span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[880px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/70">
            <th className="px-4 py-3 w-8" />
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
              #
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Type
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Section
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Page
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Tokens
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Embed Mode
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoadingChunks ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading chunks…
                </div>
              </td>
            </tr>
          ) : chunks.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-12 text-center text-sm text-gray-400"
              >
                No chunks are available for this document yet.
              </td>
            </tr>
          ) : (
            chunks.flatMap((chunk) => (
              <ChunkRows
                key={chunk.id}
                chunk={chunk}
                isOpen={expandedChunks.has(chunk.id)}
                onToggle={() => onToggleChunk(chunk.id)}
              />
            ))
          )}
        </tbody>
      </table>
      </div>
    </section>
  );
}

function ChunkRows({
  chunk,
  isOpen,
  onToggle,
}: {
  chunk: TIngestionChunk;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const rows = [
    <tr
      key={chunk.id}
      onClick={onToggle}
      className={cn(
        "cursor-pointer transition-colors hover:bg-gray-50/80",
        isOpen && "bg-indigo-50/60",
      )}
    >
      <td className="px-4 py-3.5 text-gray-400">
        {isOpen ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-500">
        {chunk.chunkIndex + 1}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {chunk.contentTypes.map((type) => (
            <ContentTypeBadge key={`${chunk.id}-${type}`} type={type} />
          ))}
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-700">
        {getChunkSectionTitle(chunk)}
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-500">
        {chunk.pageNumber ?? "—"}
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-700">
        {getChunkTokenCount(chunk).toLocaleString()}
      </td>
      <td className="px-4 py-3.5 text-xs text-indigo-600 font-medium capitalize">
        {getChunkEmbeddingMode(chunk)}
      </td>
    </tr>,
  ];

  if (isOpen) {
    const imageUrls = getChunkImageUrls(chunk);
    const tables = getChunkTables(chunk);
    rows.push(
      <tr key={`${chunk.id}-expanded`} className="bg-slate-50/80">
        <td colSpan={7} className="px-6 py-5">
          <div className="space-y-5 rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
            {tables.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  {tables.length === 1 ? "Table" : `Tables (${tables.length})`}
                </p>
                <div className="space-y-2">
                  {tables.map((tableHtml, index) => (
                    <TableHtml key={`${chunk.id}-table-${index}`} html={tableHtml} />
                  ))}
                </div>
              </div>
            )}
            {imageUrls.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Images ({imageUrls.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((src, index) => (
                    <a
                      key={`${chunk.id}-img-${index}`}
                      href={buildChunkAssetUrl(src)}
                      target="_blank"
                      rel="noreferrer"
                      className="block size-28 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:border-indigo-400"
                    >
                      <img
                        src={buildChunkAssetUrl(src)}
                        alt={`chunk ${chunk.chunkIndex + 1} image ${index + 1}`}
                        crossOrigin="use-credentials"
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {chunk.summaryContent && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="size-3.5 text-indigo-500" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Summary
                  </p>
                </div>
                <MarkdownContent content={chunk.summaryContent} />
              </div>
            )}
            {chunk.textContent && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Original text
                  </p>
                  <button
                    type="button"
                    onClick={() => copyText(chunk.textContent, "Chunk text copied")}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    <Copy className="size-3" />
                    Copy
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-slate-50/70 p-4">
                  <MarkdownContent content={chunk.textContent} className="text-xs" />
                </div>
              </div>
            )}
            {tables.length === 0 &&
              imageUrls.length === 0 &&
              !chunk.summaryContent &&
              !chunk.textContent && (
                <p className="text-sm text-gray-400">
                  This chunk has no readable content yet.
                </p>
              )}
          </div>
        </td>
      </tr>,
    );
  }

  return rows;
}
