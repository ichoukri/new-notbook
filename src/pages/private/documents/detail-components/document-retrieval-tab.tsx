import { ArrowRight, Loader2, Search, Sparkles, WandSparkles } from "lucide-react";
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
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-950">Search this document</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Run a focused semantic search against only this document's indexed chunks.
          </p>

          <div className="mt-4 flex gap-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-2 transition-shadow focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
              <Search className="size-4 shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSearch();
                  }
                }}
                placeholder="Ask about a topic, phrase, or concept…"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
            <Button
              onClick={onSearch}
              disabled={isSearching || !query.trim()}
              className="h-10 gap-2 rounded-xl px-4"
            >
              {isSearching ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              <span className="hidden sm:inline">Run search</span>
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {searchHits.length === 0 && !isSearching ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-3 text-sm font-bold text-gray-800">Test retrieval quality</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
                Search results will show the most relevant chunks, relevance score, page,
                and detected content type.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchHits.map((hit, index) => (
                <article
                  key={hit.chunkId}
                  className="group rounded-2xl border border-gray-200/80 bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-[0_10px_30px_-24px_rgba(79,70,229,0.7)] sm:p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                          <span>Chunk {hit.chunkIndex + 1}</span>
                          <span className="size-1 rounded-full bg-gray-300" />
                          <span>Page {hit.pageNumber ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(100, Math.max(8, hit.score * 10))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold tabular-nums text-indigo-700">
                            {hit.score.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-[13px] leading-6 text-gray-700">{hit.excerpt}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {hit.contentTypes.map((type) => (
                          <ContentTypeBadge key={`${hit.chunkId}-${type}`} type={type} />
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
          <Sparkles className="size-5" />
        </div>
        <h2 className="mt-4 text-sm font-bold text-gray-950">How to evaluate a result</h2>
        <div className="mt-4 space-y-4">
          {[
            ["Relevance", "The score estimates how closely the chunk matches your query."],
            ["Grounding", "Read the excerpt and confirm it contains enough context to answer."],
            ["Coverage", "Try a few phrasings to check whether important sections are discoverable."],
          ].map(([title, detail], index) => (
            <div key={title} className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="text-xs font-bold text-gray-800">{title}</p>
                <p className="mt-1 text-[11px] leading-5 text-gray-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700"
          onClick={() => {
            onQueryChange("Summarize the key topics in this document");
          }}
        >
          Try an example query <ArrowRight className="size-3.5" />
        </button>
      </aside>
    </div>
  );
}
