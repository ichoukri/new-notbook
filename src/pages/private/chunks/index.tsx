import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { ContentTypeBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocumentChunks, useDocuments } from "@/core/api/hooks";
import {
  getChunkEmbeddingMode,
  getChunkSectionTitle,
  getChunkTokenCount,
  getDocumentStatusValue,
} from "@/core/documents";
import type { TIngestionChunk } from "@/core/ingestions";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  Hash,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";

const DOCUMENT_PARAMS: Record<string, string> = {
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

const CHUNK_PARAMS: Record<string, string> = {
  active_only: "true",
  limit: "500",
};

type ChunkTab = "raw" | "embed" | "metadata";

function getChunkPreview(chunk: TIngestionChunk): string {
  return (chunk.summaryContent || chunk.textContent || "").trim() || "No chunk content available.";
}

function getPrimaryContentType(chunk: TIngestionChunk): string {
  return chunk.contentTypes[0] ?? "text";
}

function formatJson(value: unknown): string {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

function matchesChunkSearch(chunk: TIngestionChunk, query: string): boolean {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();
  return (
    getChunkSectionTitle(chunk).toLowerCase().includes(lowerQuery) ||
    chunk.textContent.toLowerCase().includes(lowerQuery) ||
    (chunk.summaryContent ?? "").toLowerCase().includes(lowerQuery)
  );
}

export default function ChunkExplorerPage() {
  const navigate = useNavigate();
  const documentsResource = useDocuments(DOCUMENT_PARAMS);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedChunkId, setSelectedChunkId] = useState("");
  const [activeTab, setActiveTab] = useState<ChunkTab>("raw");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [embeddingFilter, setEmbeddingFilter] = useState("all");

  const activeDocumentId = documentsResource.items.some(
    (document) => document.id === selectedDocumentId,
  )
    ? selectedDocumentId
    : documentsResource.items[0]?.id ?? "";
  const selectedDocument =
    documentsResource.items.find((document) => document.id === activeDocumentId) ?? null;
  const chunksResource = useDocumentChunks(activeDocumentId || null, CHUNK_PARAMS);

  const contentTypes = useMemo(
    () =>
      Array.from(
        new Set(chunksResource.items.flatMap((chunk) => chunk.contentTypes)),
      ).sort(),
    [chunksResource.items],
  );

  const filteredChunks = useMemo(() => {
    const query = search.trim();
    return chunksResource.items.filter((chunk) => {
      const matchSearch = matchesChunkSearch(chunk, query);
      const matchType = typeFilter === "all" || chunk.contentTypes.includes(typeFilter);
      const matchEmbedding =
        embeddingFilter === "all" || getChunkEmbeddingMode(chunk) === embeddingFilter;
      return matchSearch && matchType && matchEmbedding;
    });
  }, [chunksResource.items, embeddingFilter, search, typeFilter]);

  const selectedChunk =
    filteredChunks.find((chunk) => chunk.id === selectedChunkId) ??
    filteredChunks[0] ??
    null;
  const selectedIndex = selectedChunk
    ? filteredChunks.findIndex((chunk) => chunk.id === selectedChunk.id)
    : -1;

  const navTo = (direction: -1 | 1) => {
    const next = filteredChunks[selectedIndex + direction];
    if (next) setSelectedChunkId(next.id);
  };

  const refreshChunks = () => {
    void Promise.all([documentsResource.refresh(), chunksResource.refresh()]);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/40">
      <Topbar title="Chunk Explorer" />

      <div className="flex flex-1 overflow-hidden p-5 gap-4">
        <div className="w-96 flex-shrink-0 flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col gap-2">
            <Select value={activeDocumentId} onValueChange={setSelectedDocumentId}>
              <SelectTrigger className="h-9 text-xs border-gray-200 rounded-xl">
                <SelectValue placeholder="Select document" />
              </SelectTrigger>
              <SelectContent>
                {documentsResource.items.map((document) => (
                  <SelectItem key={document.id} value={document.id}>
                    {document.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <input
                placeholder="Search chunks..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-indigo-300 transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {["all", ...contentTypes].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    "text-[10px] font-semibold uppercase px-2 py-1 rounded-lg transition-all",
                    typeFilter === type
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  )}
                >
                  {type === "all" ? "All" : type}
                </button>
              ))}
              <Select value={embeddingFilter} onValueChange={setEmbeddingFilter}>
                <SelectTrigger className="h-6 text-[10px] w-28 border-gray-200 ml-auto">
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

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between gap-3 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-700">
                {filteredChunks.length} chunks
              </span>
              <button
                type="button"
                onClick={refreshChunks}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh chunks"
              >
                <RefreshCw
                  className={cn(
                    "size-3.5 text-gray-400",
                    (chunksResource.isValidating || documentsResource.isValidating) && "animate-spin",
                  )}
                />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filteredChunks.map((chunk) => {
                const isSelected = selectedChunk?.id === chunk.id;
                const sectionTitle = getChunkSectionTitle(chunk);
                return (
                  <button
                    key={chunk.id}
                    type="button"
                    onClick={() => setSelectedChunkId(chunk.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 cursor-pointer transition-all relative",
                      isSelected ? "bg-indigo-50/70" : "hover:bg-gray-50",
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-10 bg-indigo-500 rounded-full" />
                    )}
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "text-[10px] font-bold tabular-nums mt-0.5 w-8 text-center flex-shrink-0",
                          isSelected ? "text-indigo-500" : "text-gray-300",
                        )}
                      >
                        {chunk.chunkIndex}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <ContentTypeBadge type={getPrimaryContentType(chunk)} />
                          <span className="text-[10px] text-gray-400">
                            {chunk.pageNumber ? `p.${chunk.pageNumber}` : "no page"}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {getChunkTokenCount(chunk)}tok
                          </span>
                        </div>
                        <p
                          className={cn(
                            "text-xs font-semibold mb-0.5 truncate",
                            isSelected ? "text-indigo-700" : "text-gray-700",
                          )}
                        >
                          {sectionTitle}
                        </p>
                        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                          {getChunkPreview(chunk)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              {(documentsResource.isLoading || chunksResource.isLoading) && (
                <div className="px-4 py-16 text-center">
                  <Loader2 className="size-8 text-indigo-300 mx-auto mb-2 animate-spin" />
                  <p className="text-sm font-medium text-gray-500">Loading chunks</p>
                </div>
              )}

              {!chunksResource.isLoading && filteredChunks.length === 0 && (
                <div className="px-4 py-16 text-center">
                  <Layers className="size-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">
                    {selectedDocument ? "No chunks match your filters" : "Select a document to inspect chunks"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedChunk ? (
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-w-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <ContentTypeBadge type={getPrimaryContentType(selectedChunk)} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {getChunkSectionTitle(selectedChunk)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Chunk #{selectedChunk.chunkIndex}
                    {selectedChunk.pageNumber ? ` - Page ${selectedChunk.pageNumber}` : ""}
                    {` - ${getChunkTokenCount(selectedChunk)} tokens`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => navTo(-1)}
                  disabled={selectedIndex <= 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  title="Previous chunk"
                >
                  <ChevronLeft className="size-4 text-gray-500" />
                </button>
                <span className="text-xs text-gray-400 tabular-nums">
                  {selectedIndex + 1}/{filteredChunks.length}
                </span>
                <button
                  type="button"
                  onClick={() => navTo(1)}
                  disabled={selectedIndex >= filteredChunks.length - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  title="Next chunk"
                >
                  <ChevronRight className="size-4 text-gray-500" />
                </button>
                <div className="w-px h-5 bg-gray-100 mx-1" />
                <Button
                  size="icon-xs"
                  variant="ghost"
                  title="Open document"
                  onClick={() => selectedDocument && navigate(`/documents/${selectedDocument.id}`)}
                >
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex border-b border-gray-50 flex-shrink-0 px-2">
              {([
                { id: "raw", label: "Raw Text", icon: FileText },
                { id: "embed", label: "Embed Text", icon: Code2 },
                { id: "metadata", label: "Metadata", icon: Hash },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all",
                    activeTab === tab.id
                      ? "text-indigo-600 border-indigo-500"
                      : "text-gray-500 border-transparent hover:text-gray-700",
                  )}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                Embed mode:
                <span className="text-indigo-600 font-semibold capitalize">
                  {getChunkEmbeddingMode(selectedChunk)}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "raw" && (
                <div className="h-full">
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-2xl p-5 leading-relaxed border border-gray-100 min-h-32 whitespace-pre-wrap">
                    {selectedChunk.textContent || getChunkPreview(selectedChunk)}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <FileText className="size-3.5" />
                    {selectedDocument?.filename ?? "Unknown document"}
                    {selectedChunk.pageNumber ? ` - Page ${selectedChunk.pageNumber}` : ""}
                  </div>
                </div>
              )}

              {activeTab === "embed" && (
                <div className="h-full">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Embed Representation
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium capitalize">
                      {getChunkEmbeddingMode(selectedChunk)}
                    </span>
                  </div>
                  <div className="text-sm text-indigo-800 bg-indigo-50/70 rounded-2xl p-5 leading-relaxed border border-indigo-100 min-h-32 whitespace-pre-wrap">
                    {selectedChunk.summaryContent || selectedChunk.textContent || "No embedding text returned yet."}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    This is the text currently available for vector encoding. Summary mode appears when the backend has produced summaries.
                  </p>
                </div>
              )}

              {activeTab === "metadata" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    {[
                      { k: "chunk_id", v: selectedChunk.id },
                      { k: "document_id", v: selectedChunk.documentId },
                      { k: "chunk_index", v: String(selectedChunk.chunkIndex) },
                      { k: "chunk_version", v: String(selectedChunk.chunkVersion) },
                      { k: "content_types", v: selectedChunk.contentTypes.join(", ") || "text" },
                      { k: "source_page", v: selectedChunk.pageNumber ? String(selectedChunk.pageNumber) : "" },
                      { k: "token_count", v: String(getChunkTokenCount(selectedChunk)) },
                      { k: "char_count", v: String(selectedChunk.charCount) },
                      { k: "embedding_model", v: selectedChunk.embeddingModel ?? "" },
                      { k: "summary_model", v: selectedChunk.summaryModel ?? "" },
                      { k: "ingestion_status", v: selectedChunk.ingestionStatus },
                      { k: "is_active", v: String(selectedChunk.isActive) },
                    ].map((field, index) => (
                      <div
                        key={field.k}
                        className={cn(
                          "flex items-center gap-4 px-4 py-2.5 text-xs",
                          index % 2 === 0 ? "bg-gray-50/60" : "bg-white",
                        )}
                      >
                        <span className="font-mono text-indigo-600 w-36 flex-shrink-0">{field.k}</span>
                        <span className="text-gray-700 truncate">{field.v}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Chunk Metadata
                    </p>
                    <pre className="text-xs text-gray-700 bg-gray-50 rounded-2xl border border-gray-100 p-4 overflow-auto max-h-72">
                      {formatJson(selectedChunk.chunkMetadata)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-2 flex-wrap flex-shrink-0 bg-gray-50/30">
              <Tag className="size-3.5 text-gray-400" />
              {selectedChunk.contentTypes.map((type) => (
                <ContentTypeBadge key={type} type={type} />
              ))}
              <span className="ml-auto">
                <StatusBadge status={getDocumentStatusValue(selectedChunk.ingestionStatus)} />
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
            <div className="text-center px-6">
              <Layers className="size-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No chunk selected</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Choose a document with completed or in-progress ingestion to inspect backend chunks.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
