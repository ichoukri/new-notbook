import { RefreshCw, Search, Layers, Loader2 } from "lucide-react";
import { ContentTypeBadge } from "@/components/app/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getChunkSectionTitle,
  getChunkTokenCount,
} from "@/core/documents";
import type { TIngestionChunk, TIngestionDocument } from "@/core/ingestions";
import { cn } from "@/lib/utils";
import { getChunkPreview, getPrimaryContentType } from "./chunk-explorer-utils";

type ChunkSidebarProps = {
  documents: TIngestionDocument[];
  activeDocumentId: string;
  selectedDocument: TIngestionDocument | null;
  chunks: TIngestionChunk[];
  selectedChunkId: string;
  contentTypes: string[];
  search: string;
  typeFilter: string;
  embeddingFilter: string;
  isLoading: boolean;
  isValidating: boolean;
  onDocumentChange: (documentId: string) => void;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onEmbeddingFilterChange: (value: string) => void;
  onChunkSelect: (chunkId: string) => void;
  onRefresh: () => void;
};

export function ChunkSidebar({
  documents,
  activeDocumentId,
  selectedDocument,
  chunks,
  selectedChunkId,
  contentTypes,
  search,
  typeFilter,
  embeddingFilter,
  isLoading,
  isValidating,
  onDocumentChange,
  onSearchChange,
  onTypeFilterChange,
  onEmbeddingFilterChange,
  onChunkSelect,
  onRefresh,
}: ChunkSidebarProps) {
  return (
    <div className="flex w-96 flex-shrink-0 flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <Select value={activeDocumentId} onValueChange={onDocumentChange}>
          <SelectTrigger className="h-9 rounded-xl border-gray-200 text-xs">
            <SelectValue placeholder="Select document" />
          </SelectTrigger>
          <SelectContent>
            {documents.map((document) => (
              <SelectItem key={document.id} value={document.id}>
                {document.filename}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search chunks..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs outline-none transition-all placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["all", ...contentTypes].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onTypeFilterChange(type)}
              className={cn(
                "rounded-lg px-2 py-1 text-[10px] font-semibold uppercase transition-all",
                typeFilter === type
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200",
              )}
            >
              {type === "all" ? "All" : type}
            </button>
          ))}
          <Select value={embeddingFilter} onValueChange={onEmbeddingFilterChange}>
            <SelectTrigger className="ml-auto h-6 w-28 border-gray-200 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="raw">Raw</SelectItem>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-gray-700">
            {chunks.length} chunks
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            title="Refresh chunks"
          >
            <RefreshCw
              className={cn(
                "size-3.5 text-gray-400",
                isValidating && "animate-spin",
              )}
            />
          </button>
        </div>
        <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
          {chunks.map((chunk) => (
            <ChunkListItem
              key={chunk.id}
              chunk={chunk}
              isSelected={selectedChunkId === chunk.id}
              onSelect={() => onChunkSelect(chunk.id)}
            />
          ))}

          {isLoading && (
            <div className="px-4 py-16 text-center">
              <Loader2 className="mx-auto mb-2 size-8 animate-spin text-indigo-300" />
              <p className="text-sm font-medium text-gray-500">Loading chunks</p>
            </div>
          )}

          {!isLoading && chunks.length === 0 && (
            <div className="px-4 py-16 text-center">
              <Layers className="mx-auto mb-2 size-8 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">
                {selectedDocument
                  ? "No chunks match your filters"
                  : "Select a document to inspect chunks"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ChunkListItemProps = {
  chunk: TIngestionChunk;
  isSelected: boolean;
  onSelect: () => void;
};

function ChunkListItem({ chunk, isSelected, onSelect }: ChunkListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full cursor-pointer px-4 py-3 text-left transition-all",
        isSelected ? "bg-indigo-50/70" : "hover:bg-gray-50",
      )}
    >
      {isSelected && (
        <span className="absolute left-0 top-1/2 h-10 w-0.5 -translate-y-1/2 rounded-full bg-indigo-500" />
      )}
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 w-8 flex-shrink-0 text-center text-[10px] font-bold tabular-nums",
            isSelected ? "text-indigo-500" : "text-gray-300",
          )}
        >
          {chunk.chunkIndex}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <ContentTypeBadge type={getPrimaryContentType(chunk)} />
            <span className="text-[10px] text-gray-400">
              {chunk.pageNumber ? `p.${chunk.pageNumber}` : "no page"}
            </span>
            <span className="ml-auto text-[10px] text-gray-400">
              {getChunkTokenCount(chunk)}tok
            </span>
          </div>
          <p
            className={cn(
              "mb-0.5 truncate text-xs font-semibold",
              isSelected ? "text-indigo-700" : "text-gray-700",
            )}
          >
            {getChunkSectionTitle(chunk)}
          </p>
          <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-400">
            {getChunkPreview(chunk)}
          </p>
        </div>
      </div>
    </button>
  );
}
