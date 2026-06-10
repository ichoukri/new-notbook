import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { useDocumentChunks, useDocuments } from "@/core/api/hooks";
import { getChunkEmbeddingMode } from "@/core/documents";
import { ChunkDetailPanel } from "./chunk-detail-panel";
import {
  type ChunkTab,
  matchesChunkSearch,
} from "./chunk-explorer-utils";
import { ChunkSidebar } from "./chunk-sidebar";

const DOCUMENT_PARAMS: Record<string, string> = {
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

const CHUNK_PARAMS: Record<string, string> = {
  active_only: "true",
  limit: "500",
};

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
  const chunksResource = useDocumentChunks(
    activeDocumentId || null,
    CHUNK_PARAMS,
  );

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
      const matchType =
        typeFilter === "all" || chunk.contentTypes.includes(typeFilter);
      const matchEmbedding =
        embeddingFilter === "all" ||
        getChunkEmbeddingMode(chunk) === embeddingFilter;

      return (
        matchesChunkSearch(chunk, query) &&
        matchType &&
        matchEmbedding
      );
    });
  }, [chunksResource.items, embeddingFilter, search, typeFilter]);

  const selectedChunk =
    filteredChunks.find((chunk) => chunk.id === selectedChunkId) ??
    filteredChunks[0] ??
    null;
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
