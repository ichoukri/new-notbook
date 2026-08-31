import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { useChunk, useDocumentChunks, useDocuments } from "@/core/api/hooks";
import { getChunkEmbeddingMode } from "@/core/documents";
import { ChunkDetailPanel } from "./chunk-detail-panel";
import type { ChunkTab } from "./chunk-explorer-utils";
import { ChunkSidebar } from "./chunk-sidebar";

const DOCUMENT_PARAMS: Record<string, string> = {
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

const CHUNK_LIMIT = "500";

/** Keystrokes are debounced before they reach the server. */
const SEARCH_DEBOUNCE_MS = 250;

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
    documentsResource.items.find((document) => document.id === activeDocumentId) ??
    null;
  // Search runs server-side: the listing is capped at CHUNK_LIMIT, so
  // filtering in the browser would only ever search the first page of a long
  // document. Debounced so typing does not fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [search]);

  const chunkParams = useMemo(
    () => ({
      active_only: "true",
      limit: CHUNK_LIMIT,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [debouncedSearch],
  );
  const chunksResource = useDocumentChunks(
    activeDocumentId || null,
    chunkParams,
  );

  const contentTypes = useMemo(
    () =>
      Array.from(
        new Set(chunksResource.items.flatMap((chunk) => chunk.contentTypes)),
      ).sort(),
    [chunksResource.items],
  );

  // Text matching already happened on the server; these two narrow the
  // returned page further and need no round trip.
  const filteredChunks = useMemo(
    () =>
      chunksResource.items.filter((chunk) => {
        const matchType =
          typeFilter === "all" || chunk.contentTypes.includes(typeFilter);
        const matchEmbedding =
          embeddingFilter === "all" ||
          getChunkEmbeddingMode(chunk) === embeddingFilter;

        return matchType && matchEmbedding;
      }),
    [chunksResource.items, embeddingFilter, typeFilter],
  );

  const selectedListChunk =
    filteredChunks.find((chunk) => chunk.id === selectedChunkId) ??
    filteredChunks[0] ??
    null;
  // The listing omits original_content and chunk_metadata, so the detail
  // panel loads the selected chunk in full. Until it arrives the list row is
  // rendered, which already carries everything except the metadata block.
  const selectedDetail = useChunk(selectedListChunk?.id ?? null);
  const selectedChunk =
    selectedDetail.chunk?.id === selectedListChunk?.id
      ? selectedDetail.chunk
      : selectedListChunk;
  const selectedIndex = selectedChunk
    ? filteredChunks.findIndex((chunk) => chunk.id === selectedChunk.id)
    : -1;

  const navigateChunk = (direction: -1 | 1) => {
    const next = filteredChunks[selectedIndex + direction];
    if (next) {
      setSelectedChunkId(next.id);
    }
  };

  const refreshChunks = () => {
    void Promise.all([documentsResource.refresh(), chunksResource.refresh()]);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/40">
      <Topbar title="Chunk Explorer" />

      <div className="flex flex-1 gap-4 overflow-hidden p-5">
        <ChunkSidebar
          documents={documentsResource.items}
          activeDocumentId={activeDocumentId}
          selectedDocument={selectedDocument}
          chunks={filteredChunks}
          selectedChunkId={selectedChunk?.id ?? ""}
          contentTypes={contentTypes}
          search={search}
          typeFilter={typeFilter}
          embeddingFilter={embeddingFilter}
          isLoading={documentsResource.isLoading || chunksResource.isLoading}
          isValidating={
            documentsResource.isValidating || chunksResource.isValidating
          }
          onDocumentChange={setSelectedDocumentId}
          onSearchChange={setSearch}
          onTypeFilterChange={setTypeFilter}
          onEmbeddingFilterChange={setEmbeddingFilter}
          onChunkSelect={setSelectedChunkId}
          onRefresh={refreshChunks}
        />

        <ChunkDetailPanel
          chunk={selectedChunk}
          selectedDocument={selectedDocument}
          selectedIndex={selectedIndex}
          totalCount={filteredChunks.length}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigateChunk={navigateChunk}
          onOpenDocument={() => {
            if (selectedDocument) {
              navigate(`/documents/${selectedDocument.id}`);
            }
          }}
        />
      </div>
    </div>
  );
}
