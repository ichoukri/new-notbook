import { useRef } from "react";
import {
  Bug,
  Clock,
  Cpu,
  Database,
  Loader2,
  MessageSquareText,
  Network,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { TDataset } from "@/core/datasets";
import type {
  TRetrievalQueryExpansionMode,
  TRetrievalSearchDebug,
  TRetrievalSearchHit,
} from "@/core/retrieval";
import { cn } from "@/lib/utils";
import {
  CONTENT_TYPE_OPTIONS,
  EXAMPLE_QUERIES,
  SEARCH_MODES,
  type RetrievalSearchModeId,
} from "./options";

type SearchHandler = (value?: string) => void | Promise<void>;

type RetrievalSearchPanelProps = {
  datasets: TDataset[];
  query: string;
  committedQuery: string;
  results: TRetrievalSearchHit[] | null;
  latency: number | null;
  searching: boolean;
  answering: boolean;
  isLoadingDatasets: boolean;
  searchMode: RetrievalSearchModeId;
  lastRunMode: RetrievalSearchModeId | null;
  queryExpansion: TRetrievalQueryExpansionMode;
  dataset: string;
  contentTypeFilter: string;
  candidateK: number | null;
  topK: number[];
  showFilters: boolean;
  debugEnabled: boolean;
  debugInfo: TRetrievalSearchDebug | null;
  pageError: string;
  onQueryChange: (query: string) => void;
  onSearch: SearchHandler;
  onAnswer: SearchHandler;
  onClear: () => void;
  onSearchModeChange: (mode: RetrievalSearchModeId) => void;
  onDatasetChange: (datasetId: string) => void;
  onContentTypeFilterChange: (contentType: string) => void;
  onQueryExpansionChange: (mode: TRetrievalQueryExpansionMode) => void;
  onCandidateKChange: (value: number | null) => void;
  onTopKChange: (value: number[]) => void;
  onShowFiltersChange: (value: boolean) => void;
  onDebugEnabledChange: (enabled: boolean) => void;
};

export function RetrievalSearchPanel({
  datasets,
  query,
  committedQuery,
  results,
  latency,
  searching,
  answering,
  isLoadingDatasets,
  searchMode,
  lastRunMode,
  queryExpansion,
  dataset,
  contentTypeFilter,
  candidateK,
  topK,
  showFilters,
  debugEnabled,
  debugInfo,
  pageError,
  onQueryChange,
  onSearch,
  onAnswer,
  onClear,
  onSearchModeChange,
  onDatasetChange,
  onContentTypeFilterChange,
  onQueryExpansionChange,
  onCandidateKChange,
  onTopKChange,
  onShowFiltersChange,
  onDebugEnabledChange,
}: RetrievalSearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFilters =
    dataset !== "all" ||
    contentTypeFilter !== "all" ||
    queryExpansion !== "none" ||
    candidateK !== null ||
    debugEnabled;
  const activeVectorStore =
    results?.find((item) => item.vectorStore)?.vectorStore ?? null;
  const activeModelHit = results?.find(
    (item) => item.summaryModel || item.embeddingModel,
  );
  const activeModel =
    activeModelHit?.summaryModel ?? activeModelHit?.embeddingModel ?? null;
  const formatDebugQuery = (value: string) =>
    value.length > 40 ? `${value.slice(0, 40)}...` : value;

  const runSearch = (value?: string) => {
    void onSearch(value);
  };
  const runAnswer = (value?: string) => {
    void onAnswer(value);
  };
  const busy = searching || answering;

  const clearSearch = () => {
    onClear();
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-4 border-b border-gray-100 bg-white px-6 py-5">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            className={cn(
              "absolute left-4 top-1/2 size-5 -translate-y-1/2 transition-colors",
              query ? "text-indigo-500" : "text-gray-300",
            )}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runSearch();
              }
            }}
            placeholder="Ask anything about your indexed documents..."
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-10 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:ring-3 focus:ring-indigo-50"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 rounded-lg p-1 -translate-y-1/2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button
          onClick={() => runSearch()}
          disabled={busy || !query.trim()}
          className="h-12 min-w-28 gap-2 px-6 text-sm font-semibold"
        >
          {searching ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Searching
            </>
          ) : (
            <>
              <Search className="size-4" />
              Search
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => runAnswer()}
          disabled={busy || !query.trim()}
          className="h-12 min-w-28 gap-2 border-emerald-200 bg-emerald-50 px-6 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
          title="Generate an answer only when retrieved evidence supports it"
        >
          {answering ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Answering
            </>
          ) : (
            <>
              <MessageSquareText className="size-4" />
              Ask
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          {SEARCH_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSearchModeChange(mode.id)}
              title={mode.desc}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                searchMode === mode.id
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <mode.icon className="size-3" />
              {mode.label}
            </button>
          ))}
        </div>

        <Select value={dataset} onValueChange={onDatasetChange}>
          <SelectTrigger
            className="h-8 w-52 border-gray-200 text-xs"
            disabled={isLoadingDatasets}
          >
            <Database className="mr-1.5 size-3 text-gray-400" />
            <SelectValue
              placeholder={
                isLoadingDatasets ? "Loading datasets..." : "All Datasets"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Datasets</SelectItem>
            {datasets.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => onShowFiltersChange(!showFilters)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all",
            showFilters || hasFilters
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700",
          )}
        >
          <SlidersHorizontal className="size-3" />
          Filters
          {hasFilters && <span className="ml-0.5 size-1.5 rounded-full bg-indigo-500" />}
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="whitespace-nowrap text-xs text-gray-500">Top-K</span>
          <div className="w-28">
            <Slider value={topK} onValueChange={onTopKChange} min={1} max={20} step={1} />
          </div>
          <span className="w-4 text-xs font-semibold tabular-nums text-indigo-700">
            {topK[0]}
          </span>
        </div>
      </div>

      {showFilters && (
        <div className="space-y-3 border-t border-gray-50 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-gray-500">Content type:</span>
            {CONTENT_TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onContentTypeFilterChange(type)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                  contentTypeFilter === type
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300",
                )}
              >
                {type === "all" ? "All types" : type.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">
                Query expansion:
              </span>
              <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
                {([
                  { id: "none", label: "None" },
                  { id: "multi_query", label: "Multi-Query" },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onQueryExpansionChange(option.id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      queryExpansion === option.id
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {queryExpansion === "multi_query" && (
                <span className="text-xs text-indigo-500">
                  <Network className="mr-0.5 inline size-3" />5 query variations
                  via LLM
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs font-medium text-gray-500">
                Candidate-K:
              </span>
              <Select
                value={candidateK === null ? "auto" : String(candidateK)}
                onValueChange={(value) =>
                  onCandidateKChange(value === "auto" ? null : Number(value))
                }
              >
                <SelectTrigger className="h-7 w-24 border-gray-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                  <SelectItem value="80">80</SelectItem>
                  <SelectItem value="120">120</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-400">
                candidates before re-ranking
              </span>
            </div>

            <button
              type="button"
              onClick={() => onDebugEnabledChange(!debugEnabled)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                debugEnabled
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300",
              )}
            >
              <Bug className="size-3" />
              Debug
            </button>
          </div>
        </div>
      )}

      {!results && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Suggested:</span>
          {EXAMPLE_QUERIES.map((exampleQuery) => (
            <button
              key={exampleQuery}
              type="button"
              onClick={() => {
                onQueryChange(exampleQuery);
                runSearch(exampleQuery);
              }}
              className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700"
            >
              <Sparkles className="size-2.5" />
              {exampleQuery}
            </button>
          ))}
        </div>
      )}

      {results && latency !== null && (
        <div className="flex flex-wrap items-center gap-5 border-t border-gray-50 pt-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            {results.length} result{results.length !== 1 ? "s" : ""} for{" "}
            <span className="text-indigo-700">"{committedQuery}"</span>
          </span>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3 text-gray-400" />
            <span>{latency}ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="size-3 text-gray-400" />
            <span>{activeVectorStore ?? "Backend chunk index"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="size-3 text-gray-400" />
            <span>{activeModel ?? "Stored chunk text"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="size-3 text-gray-400" />
            <span className="capitalize">{lastRunMode ?? searchMode}</span>
          </div>
          {queryExpansion === "multi_query" && (
            <div className="flex items-center gap-1.5">
              <Network className="size-3 text-gray-400" />
              <span>Multi-Query</span>
            </div>
          )}
          <button
            type="button"
            onClick={clearSearch}
            className="ml-auto flex items-center gap-1 text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="size-3" />
            Clear
          </button>
        </div>
      )}

      {debugInfo && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bug className="size-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">Debug Info</span>
            <span className="text-xs text-amber-600">
              {debugInfo.finalCandidateCount} candidates (limit{" "}
              {debugInfo.candidateLimit})
            </span>
          </div>
          {debugInfo.graphOutcome && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-amber-700">
              <span>
                Graph: {debugInfo.graphOutcome.replaceAll("_", " ")}
              </span>
              <span>{debugInfo.graphSeedCount} entity seeds</span>
              <span>{debugInfo.graphEvidenceCount} evidence chunks</span>
            </div>
          )}
          {debugInfo.expandedQueries.length > 1 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-amber-700">
                Expanded Queries:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {debugInfo.expandedQueries.map((expandedQuery, index) => (
                  <span
                    key={`${expandedQuery}-${index}`}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      index === 0
                        ? "bg-amber-200 font-medium text-amber-900"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {index === 0 && "original: "}
                    {expandedQuery}
                  </span>
                ))}
              </div>
            </div>
          )}
          {debugInfo.perQueryCandidateCounts.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs text-amber-700">
              {debugInfo.perQueryCandidateCounts.map((item, index) => (
                <span key={`${item.query}-${index}`}>
                  <span className="font-mono">{item.candidateCount}</span>{" "}
                  hits for "{formatDebugQuery(item.query)}"
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}
    </div>
  );
}
