import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  Hash,
  Layers,
  Tag,
} from "lucide-react";
import { MarkdownContent } from "@/components/app/markdown";
import { ContentTypeBadge, StatusBadge } from "@/components/app/status-badge";
import { TableHtml } from "@/components/app/table-html";
import { Button } from "@/components/ui/button";
import { buildChunkAssetUrl } from "@/core/api";
import {
  getChunkEmbeddingMode,
  getChunkSectionTitle,
  getChunkTokenCount,
  getDocumentStatusValue,
} from "@/core/documents";
import {
  getChunkImageUrls,
  getChunkTables,
  type TIngestionChunk,
  type TIngestionDocument,
} from "@/core/ingestions";
import { cn } from "@/lib/utils";
import {
  type ChunkTab,
  formatJson,
  getChunkMetadataFields,
  getChunkPreview,
  getPrimaryContentType,
} from "./chunk-explorer-utils";

type ChunkDetailPanelProps = {
  chunk: TIngestionChunk | null;
  selectedDocument: TIngestionDocument | null;
  selectedIndex: number;
  totalCount: number;
  activeTab: ChunkTab;
  onTabChange: (tab: ChunkTab) => void;
  onNavigateChunk: (direction: -1 | 1) => void;
  onOpenDocument: () => void;
};

export function ChunkDetailPanel({
  chunk,
  selectedDocument,
  selectedIndex,
  totalCount,
  activeTab,
  onTabChange,
  onNavigateChunk,
  onOpenDocument,
}: ChunkDetailPanelProps) {
  if (!chunk) {
    return <EmptyChunkPanel />;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <ChunkDetailHeader
        chunk={chunk}
        selectedIndex={selectedIndex}
        totalCount={totalCount}
        onNavigateChunk={onNavigateChunk}
        onOpenDocument={onOpenDocument}
      />

      <ChunkDetailTabs
        activeTab={activeTab}
        chunk={chunk}
        onTabChange={onTabChange}
      />

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "raw" && (
          <RawChunkTab chunk={chunk} selectedDocument={selectedDocument} />
        )}
        {activeTab === "embed" && <EmbedChunkTab chunk={chunk} />}
        {activeTab === "metadata" && <MetadataChunkTab chunk={chunk} />}
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-t border-gray-50 bg-gray-50/30 px-5 py-3">
        <Tag className="size-3.5 text-gray-400" />
        {chunk.contentTypes.map((type) => (
          <ContentTypeBadge key={type} type={type} />
        ))}
        <span className="ml-auto">
          <StatusBadge status={getDocumentStatusValue(chunk.ingestionStatus)} />
        </span>
      </div>
    </div>
  );
}

type ChunkDetailHeaderProps = {
  chunk: TIngestionChunk;
  selectedIndex: number;
  totalCount: number;
  onNavigateChunk: (direction: -1 | 1) => void;
  onOpenDocument: () => void;
};

function ChunkDetailHeader({
  chunk,
  selectedIndex,
  totalCount,
  onNavigateChunk,
  onOpenDocument,
}: ChunkDetailHeaderProps) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-50 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <ContentTypeBadge type={getPrimaryContentType(chunk)} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {getChunkSectionTitle(chunk)}
          </p>
          <p className="text-xs text-gray-500">
            Chunk #{chunk.chunkIndex}
            {chunk.pageNumber ? ` - Page ${chunk.pageNumber}` : ""}
            {` - ${getChunkTokenCount(chunk)} tokens`}
          </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigateChunk(-1)}
          disabled={selectedIndex <= 0}
          className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-30"
          title="Previous chunk"
        >
          <ChevronLeft className="size-4 text-gray-500" />
        </button>
        <span className="text-xs tabular-nums text-gray-400">
          {selectedIndex + 1}/{totalCount}
        </span>
        <button
          type="button"
          onClick={() => onNavigateChunk(1)}
          disabled={selectedIndex >= totalCount - 1}
          className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-30"
          title="Next chunk"
        >
          <ChevronRight className="size-4 text-gray-500" />
        </button>
        <div className="mx-1 h-5 w-px bg-gray-100" />
        <Button
          size="icon-xs"
          variant="ghost"
          title="Open document"
          onClick={onOpenDocument}
        >
          <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

type ChunkDetailTabsProps = {
  activeTab: ChunkTab;
  chunk: TIngestionChunk;
  onTabChange: (tab: ChunkTab) => void;
};

function ChunkDetailTabs({
  activeTab,
  chunk,
  onTabChange,
}: ChunkDetailTabsProps) {
  const tabs = [
    { id: "raw", label: "Raw Text", icon: FileText },
    { id: "embed", label: "Embed Text", icon: Code2 },
    { id: "metadata", label: "Metadata", icon: Hash },
  ] as const;

  return (
    <div className="flex flex-shrink-0 border-b border-gray-50 px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-all",
            activeTab === tab.id
              ? "border-indigo-500 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700",
          )}
        >
          <tab.icon className="size-3.5" />
          {tab.label}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
        Embed mode:
        <span className="font-semibold capitalize text-indigo-600">
          {getChunkEmbeddingMode(chunk)}
        </span>
      </div>
    </div>
  );
}

function RawChunkTab({
  chunk,
  selectedDocument,
}: {
  chunk: TIngestionChunk;
  selectedDocument: TIngestionDocument | null;
}) {
  const tables = getChunkTables(chunk);
  const imageUrls = getChunkImageUrls(chunk);

  return (
    <div className="h-full space-y-4">
      {tables.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {tables.length === 1 ? "Table" : `Tables (${tables.length})`}
          </p>
          <div className="space-y-2">
            {tables.map((tableHtml, index) => (
              <TableHtml key={`table-${index}`} html={tableHtml} />
            ))}
          </div>
        </div>
      )}
      {imageUrls.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Images ({imageUrls.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {imageUrls.map((src, index) => (
              <a
                key={`img-${index}`}
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
      <div className="min-h-32 rounded-2xl border border-gray-100 bg-gray-50 p-5">
        {chunk.textContent ? (
          <MarkdownContent content={chunk.textContent} />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {getChunkPreview(chunk)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <FileText className="size-3.5" />
        {selectedDocument?.filename ?? "Unknown document"}
        {chunk.pageNumber ? ` - Page ${chunk.pageNumber}` : ""}
      </div>
    </div>
  );
}

function EmbedChunkTab({ chunk }: { chunk: TIngestionChunk }) {
  return (
    <div className="h-full">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Embed Representation
        </span>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium capitalize text-indigo-700">
          {getChunkEmbeddingMode(chunk)}
        </span>
      </div>
      <div className="min-h-32 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
        {chunk.summaryContent || chunk.textContent ? (
          <MarkdownContent
            content={chunk.summaryContent || chunk.textContent}
            className="text-indigo-900"
          />
        ) : (
          <p className="text-sm text-indigo-800">
            No embedding text returned yet.
          </p>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        This is the text currently available for vector encoding. Summary mode
        appears when the backend has produced summaries.
      </p>
    </div>
  );
}

function MetadataChunkTab({ chunk }: { chunk: TIngestionChunk }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-gray-100">
        {getChunkMetadataFields(chunk).map((field, index) => (
          <div
            key={field.key}
            className={cn(
              "flex items-center gap-4 px-4 py-2.5 text-xs",
              index % 2 === 0 ? "bg-gray-50/60" : "bg-white",
            )}
          >
            <span className="w-36 flex-shrink-0 font-mono text-indigo-600">
              {field.key}
            </span>
            <span className="truncate text-gray-700">{field.value}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Chunk Metadata
        </p>
        <pre className="max-h-72 overflow-auto rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-700">
          {formatJson(chunk.chunkMetadata)}
        </pre>
      </div>
    </div>
  );
}

function EmptyChunkPanel() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="px-6 text-center">
        <Layers className="mx-auto mb-3 size-10 text-gray-200" />
        <p className="text-sm font-semibold text-gray-700">No chunk selected</p>
        <p className="mt-1 max-w-sm text-xs text-gray-400">
          Choose a document with completed or in-progress ingestion to inspect
          backend chunks.
        </p>
      </div>
    </div>
  );
}
