import { Loader2, Search, Sparkles } from "lucide-react";
import { ContentTypeBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import type { TDocumentSearchHit } from "@/core/documents";

export function DocumentRetrievalTab({
  query,
  searchHits,
  isSearching,
  onQueryChange,
  onSearch,
}: {
  query: string;
  searchHits: TDocumentSearchHit[];
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
            }
          }}
          placeholder="Search within this document..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <Button size="sm" onClick={onSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
        </Button>
      </div>

      {searchHits.length === 0 && !isSearching ? (
        <div className="p-8 text-center text-sm text-gray-400 bg-gray-50 rounded-xl">
          Enter a query above to preview retrieval across this document's stored
          chunks.
        </div>
      ) : (
        <div className="space-y-3">
          {searchHits.map((hit) => (
            <div
              key={hit.chunkId}
              className="rounded-xl border border-gray-100 bg-gray-50/70 p-4"
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Sparkles className="size-3.5 text-indigo-500" />
                  Chunk {hit.chunkIndex + 1}
                  <span>•</span>
                  Page {hit.pageNumber ?? "—"}
                </div>
                <div className="text-xs font-medium text-indigo-600">
                  Score {hit.score.toFixed(2)}
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {hit.excerpt}
              </p>
              <div className="flex gap-1.5 flex-wrap mt-3">
                {hit.contentTypes.map((type) => (
                  <ContentTypeBadge key={`${hit.chunkId}-${type}`} type={type} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
