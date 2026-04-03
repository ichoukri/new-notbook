import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { ContentTypeBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import { type TBackendDataset, type TDataset, mapBackendDataset } from "@/core/datasets";
import {
  getRetrievalLanguage,
  getRetrievalPrimaryContentType,
  getRetrievalSectionTitle,
  getRetrievalTags,
  getRetrievalTokenCount,
  mapBackendRetrievalSearchDebug,
  mapBackendRetrievalSearchHit,
  type TBackendRetrievalSearchResponse,
  type TRetrievalQueryExpansionMode,
  type TRetrievalSearchDebug,
  type TRetrievalSearchHit,
  type TRetrievalSearchRequest,
} from "@/core/retrieval";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  BookOpen,
  Bug,
  ChevronRight,
  Clock,
  Code2,
  Cpu,
  Database,
  FileText,
  Filter,
  Loader2,
  Network,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
  Zap,
} from "lucide-react";

const EXAMPLE_QUERIES = [
  "How does authentication work?",
  "What are the rate limits?",
  "How do I install the SDK?",
  "Architecture overview",
];

const SEARCH_MODES = [
  { id: "semantic", label: "Semantic", icon: Sparkles, desc: "Summary-weighted retrieval preview" },
  { id: "hybrid", label: "Hybrid", icon: Zap, desc: "Summary + raw text combined" },
  { id: "keyword", label: "Keyword", icon: BookOpen, desc: "Exact keyword matching" },
] as const;

const CONTENT_TYPE_OPTIONS = [
  "all",
  "text",
  "table",
  "ocr",
  "image",
  "mixed",
  "transcript",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const styles =
    pct >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    pct >= 75 ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
    pct >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-red-50 text-red-700 border-red-200";

  return (
    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums", styles)}>
      {score.toFixed(3)}
    </span>
  );
}

function highlightParts(text: string, query: string): string[] {
  if (!query.trim()) {
    return [text];
  }

  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);

  if (words.length === 0) {
    return [text];
  }

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  return text.split(regex);
}

export default function RetrievalTestPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [results, setResults] = useState<TRetrievalSearchHit[] | null>(null);
  const [selectedResult, setSelectedResult] = useState<TRetrievalSearchHit | null>(null);
  const [topK, setTopK] = useState([5]);
  const [candidateK, setCandidateK] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<(typeof SEARCH_MODES)[number]["id"]>("semantic");
  const [queryExpansion, setQueryExpansion] = useState<TRetrievalQueryExpansionMode>("none");
  const [lastRunMode, setLastRunMode] = useState<(typeof SEARCH_MODES)[number]["id"] | null>(null);
  const [dataset, setDataset] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [latency, setLatency] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugInfo, setDebugInfo] = useState<TRetrievalSearchDebug | null>(null);
  const [pageError, setPageError] = useState("");
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDatasets = async () => {
      setIsLoadingDatasets(true);

      try {
        const response = await backendApi.findMany<TBackendDataset>(
          "/datasets/",
          {
            include_documents: "false",
            limit: "100",
            sort_by: "updated_at",
            sort_order: "desc",
          },
        );

        if (!cancelled) {
          setDatasets(response.map(mapBackendDataset));
        }
      } catch (error) {
        if (!cancelled) {
          setDatasets([]);
          setPageError(getApiErrorMessage(error, "Could not load datasets."));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDatasets(false);
        }
      }
    };

    void loadDatasets();

    return () => {
      cancelled = true;
    };
  }, []);

  const datasetNamesById = useMemo(
    () => new Map(datasets.map((item) => [item.id, item.name])),
    [datasets],
  );

  const activeVectorStore = useMemo(
    () => results?.find((item) => item.vectorStore)?.vectorStore ?? null,
    [results],
  );
  const activeModel = useMemo(
    () =>
      results?.find((item) => item.summaryModel || item.embeddingModel)?.summaryModel ??
      results?.find((item) => item.summaryModel || item.embeddingModel)?.embeddingModel ??
      null,
    [results],
  );

  const executeSearch = async (value = query) => {
    const trimmedQuery = value.trim();
    if (!trimmedQuery || searching) {
      return;
    }

    setSearching(true);
    setCommittedQuery(trimmedQuery);
    setSelectedResult(null);
    setDebugInfo(null);
    setPageError("");
    setLastRunMode(searchMode);

    const startedAt = performance.now();

    try {
      const payload: TRetrievalSearchRequest = {
        query: trimmedQuery,
        search_mode: searchMode,
        query_expansion: queryExpansion,
        top_k: topK[0],
        candidate_k: candidateK,
        scope: {
          dataset_id: dataset !== "all" ? dataset : null,
        },
        filters: {
          content_types: contentTypeFilter !== "all" ? [contentTypeFilter] : [],
        },
        debug: debugEnabled,
      };

      const response = await backendApi.create<
        TBackendRetrievalSearchResponse,
        TRetrievalSearchRequest
      >("/retrieval/search", payload);

      setResults(response.hits.map(mapBackendRetrievalSearchHit));
      setDebugInfo(response.debug ? mapBackendRetrievalSearchDebug(response.debug) : null);
      setLatency(Math.round(performance.now() - startedAt));
    } catch (error) {
      setResults([]);
      setLatency(Math.round(performance.now() - startedAt));
      setPageError(getApiErrorMessage(error, "Could not run retrieval search."));
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setCommittedQuery("");
    setResults(null);
    setSelectedResult(null);
    setDebugInfo(null);
    setLatency(null);
    setPageError("");
    setLastRunMode(null);
    inputRef.current?.focus();
  };

  const hasFilters = dataset !== "all" || contentTypeFilter !== "all" || queryExpansion !== "none" || candidateK !== null || debugEnabled;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Retrieval Test" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-6 py-5 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 size-5 transition-colors",
                  query ? "text-indigo-500" : "text-gray-300",
                )}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void executeSearch();
                  }
                }}
                placeholder="Ask anything about your indexed documents..."
                className="w-full h-12 pl-12 pr-10 text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-300 focus:ring-3 focus:ring-indigo-50 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              onClick={() => void executeSearch()}
              disabled={searching || !query.trim()}
              className="h-12 px-6 text-sm font-semibold gap-2 min-w-28"
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
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {SEARCH_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSearchMode(mode.id)}
                  title={mode.desc}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
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

            <Select value={dataset} onValueChange={setDataset}>
              <SelectTrigger className="h-8 w-52 text-xs border-gray-200" disabled={isLoadingDatasets}>
                <Database className="size-3 mr-1.5 text-gray-400" />
                <SelectValue placeholder={isLoadingDatasets ? "Loading datasets..." : "All Datasets"} />
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
              onClick={() => setShowFilters((value) => !value)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-all",
                showFilters || hasFilters
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700",
              )}
            >
              <SlidersHorizontal className="size-3" />
              Filters
              {hasFilters && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
              )}
            </button>

            <div className="flex items-center gap-2.5 ml-auto">
              <span className="text-xs text-gray-500 whitespace-nowrap">Top-K</span>
              <div className="w-28">
                <Slider value={topK} onValueChange={setTopK} min={1} max={20} step={1} />
              </div>
              <span className="text-xs font-semibold text-indigo-700 w-4 tabular-nums">{topK[0]}</span>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-3 pt-1 border-t border-gray-50">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Content type:</span>
                {CONTENT_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setContentTypeFilter(type)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                      contentTypeFilter === type
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300",
                    )}
                  >
                    {type === "all" ? "All types" : type.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Query expansion:</span>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    {([
                      { id: "none", label: "None" },
                      { id: "multi_query", label: "Multi-Query" },
                    ] as const).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setQueryExpansion(option.id)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-md font-medium transition-all",
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
                      <Network className="size-3 inline mr-0.5" />
                      5 query variations via LLM
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Candidate-K:</span>
                  <Select
                    value={candidateK === null ? "auto" : String(candidateK)}
                    onValueChange={(value) => setCandidateK(value === "auto" ? null : Number(value))}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs border-gray-200">
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
                  <span className="text-xs text-gray-400">candidates before re-ranking</span>
                </div>

                <button
                  type="button"
                  onClick={() => setDebugEnabled((value) => !value)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Suggested:</span>
              {EXAMPLE_QUERIES.map((exampleQuery) => (
                <button
                  key={exampleQuery}
                  type="button"
                  onClick={() => {
                    setQuery(exampleQuery);
                    void executeSearch(exampleQuery);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                >
                  <Sparkles className="size-2.5" />
                  {exampleQuery}
                </button>
              ))}
            </div>
          )}

          {results && latency !== null && (
            <div className="flex items-center gap-5 text-xs text-gray-500 pt-1 border-t border-gray-50 flex-wrap">
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
                className="ml-auto flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="size-3" />
                Clear
              </button>
            </div>
          )}

          {debugInfo && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <Bug className="size-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800">Debug Info</span>
                <span className="text-xs text-amber-600">
                  {debugInfo.finalCandidateCount} candidates (limit {debugInfo.candidateLimit})
                </span>
              </div>
              {debugInfo.expandedQueries.length > 1 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-amber-700">Expanded Queries:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {debugInfo.expandedQueries.map((expandedQuery, index) => (
                      <span
                        key={`${expandedQuery}-${index}`}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          index === 0
                            ? "bg-amber-200 text-amber-900 font-medium"
                            : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {index === 0 && "original: "}{expandedQuery}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {debugInfo.perQueryCandidateCounts.length > 0 && (
                <div className="flex flex-wrap gap-3 text-xs text-amber-700">
                  {debugInfo.perQueryCandidateCounts.map((item, index) => (
                    <span key={`${item.query}-${index}`}>
                      <span className="font-mono">{item.candidateCount}</span> hits for "{item.query.length > 40 ? `${item.query.slice(0, 40)}...` : item.query}"
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

        <div className="flex flex-1 overflow-hidden">
          {!results && !searching && (
            <div className="flex-1 flex flex-col items-center justify-center p-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center mb-5">
                <Search className="size-9 text-indigo-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">Ready to search</h3>
              <p className="text-sm text-gray-400 text-center max-w-sm mb-8">
                Enter a query above to test retrieval across your indexed content. Results show chunk scores, snippets, and metadata.
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-xl w-full">
                {[
                  { icon: Sparkles, label: "Semantic search", desc: "Find relevant content by meaning" },
                  { icon: Filter, label: "Metadata filters", desc: "Narrow results by type or dataset" },
                  { icon: Code2, label: "Inspect embed text", desc: "Compare raw vs embed representation" },
                ].map((feature) => (
                  <div key={feature.label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-2">
                      <feature.icon className="size-4 text-indigo-500" />
                    </div>
                    <p className="text-xs font-semibold text-gray-700 mb-0.5">{feature.label}</p>
                    <p className="text-xs text-gray-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searching && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database className="size-5 text-indigo-400" />
                </div>
              </div>
              <p className="text-sm text-gray-500">Querying indexed chunks...</p>
            </div>
          )}

          {results && !searching && (
            <div className="flex flex-1 overflow-hidden">
              <div
                className={cn(
                  "flex flex-col overflow-y-auto transition-all",
                  selectedResult ? "w-[54%]" : "flex-1",
                )}
              >
                <div className="p-5 space-y-3">
                  {results.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                      <Search className="size-8 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600">No results found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Try adjusting your query, filters, or increasing Top-K.
                      </p>
                    </div>
                  ) : (
                    results.map((result, index) => (
                      <ResultCard
                        key={result.chunkId}
                        result={result}
                        rank={index + 1}
                        query={committedQuery}
                        selected={selectedResult?.chunkId === result.chunkId}
                        datasetNamesById={datasetNamesById}
                        onClick={() =>
                          setSelectedResult(
                            selectedResult?.chunkId === result.chunkId ? null : result,
                          )
                        }
                        onOpenDocument={() => navigate(`/documents/${result.documentId}`)}
                      />
                    ))
                  )}
                </div>
              </div>

              {selectedResult && (
                <div className="w-[46%] flex-shrink-0 border-l border-gray-100 bg-white flex flex-col overflow-hidden">
                  <PreviewPanel
                    result={selectedResult}
                    datasetNamesById={datasetNamesById}
                    onClose={() => setSelectedResult(null)}
                    onOpenDocument={() => navigate(`/documents/${selectedResult.documentId}`)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  rank,
  query,
  selected,
  datasetNamesById,
  onClick,
  onOpenDocument,
}: {
  result: TRetrievalSearchHit;
  rank: number;
  query: string;
  selected: boolean;
  datasetNamesById: Map<string, string>;
  onClick: () => void;
  onOpenDocument: () => void;
}) {
  const pct = Math.round(result.score * 100);
  const parts = highlightParts(result.excerpt, query);
  const datasetLabel =
    result.datasetIds.map((datasetId) => datasetNamesById.get(datasetId)).find(Boolean) ??
    "Unknown Dataset";

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border shadow-sm cursor-pointer transition-all group",
        selected
          ? "border-indigo-300 shadow-indigo-100 ring-1 ring-indigo-200"
          : "border-gray-100 hover:border-indigo-200 hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "h-0.5 rounded-t-2xl transition-all",
          pct >= 90 ? "bg-emerald-400" :
          pct >= 75 ? "bg-indigo-400" :
          pct >= 60 ? "bg-amber-400" : "bg-red-300",
        )}
        style={{ width: `${pct}%` }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-gray-100 text-xs font-bold text-gray-500 flex items-center justify-center mt-0.5">
              {rank}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <ContentTypeBadge type={getRetrievalPrimaryContentType(result)} />
                <span className="text-xs text-gray-500">
                  p.{result.pageNumber ?? "—"} · {getRetrievalTokenCount(result)} tokens
                </span>
                <span className="text-xs text-gray-400 capitalize">
                  · {result.embeddingMode} embed
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                {getRetrievalSectionTitle(result)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ScoreBadge score={result.score} />
            <ChevronRight
              className={cn(
                "size-4 transition-all",
                selected ? "text-indigo-400 rotate-90" : "text-gray-200 group-hover:text-gray-400",
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 pl-9">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 90 ? "bg-emerald-400" :
                pct >= 75 ? "bg-indigo-400" :
                pct >= 60 ? "bg-amber-400" : "bg-red-300",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{pct}% relevance</span>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed pl-9 line-clamp-3">
          {parts.map((part, index) =>
            index % 2 === 1 ? (
              <mark key={`${part}-${index}`} className="bg-indigo-100 text-indigo-800 rounded px-0.5 font-medium not-italic">
                {part}
              </mark>
            ) : (
              <span key={`${part}-${index}`}>{part}</span>
            ),
          )}
        </p>

        <div className="flex items-center gap-3 mt-3 pl-9 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FileText className="size-3" />
            <span>{result.documentFilename}</span>
            <span>·</span>
            <span>{datasetLabel}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {getRetrievalTags(result, { datasetNamesById }).map((tag) => (
              <span key={`${result.chunkId}-${tag}`} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                <Tag className="size-2.5" />
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDocument();
            }}
          >
            Open document <ArrowUpRight className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({
  result,
  datasetNamesById,
  onClose,
  onOpenDocument,
}: {
  result: TRetrievalSearchHit;
  datasetNamesById: Map<string, string>;
  onClose: () => void;
  onOpenDocument: () => void;
}) {
  const pct = Math.round(result.score * 100);
  const datasetLabel = result.datasetIds
    .map((datasetId) => datasetNamesById.get(datasetId) ?? datasetId)
    .join(", ") || "Unknown Dataset";
  const tags = getRetrievalTags(result, { datasetNamesById });

  return (
    <>
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <ContentTypeBadge type={getRetrievalPrimaryContentType(result)} />
            <ScoreBadge score={result.score} />
          </div>
          <p className="text-sm font-semibold text-gray-900">{getRetrievalSectionTitle(result)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Chunk #{result.chunkIndex + 1} · Page {result.pageNumber ?? "—"} · {getRetrievalTokenCount(result)} tokens
          </p>
          <button
            type="button"
            onClick={onOpenDocument}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700"
          >
            {result.documentFilename}
            <ArrowUpRight className="size-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">Relevance Score</span>
          <span
            className={cn(
              "text-xs font-bold",
              pct >= 90 ? "text-emerald-700" : pct >= 75 ? "text-indigo-700" : "text-amber-700",
            )}
          >
            {pct}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-indigo-500" : "bg-amber-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Tabs defaultValue="chunk" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="flex-shrink-0 border-b border-gray-100 rounded-none h-auto bg-transparent p-0 justify-start">
          {[
            { value: "chunk", label: "Chunk", icon: FileText },
            { value: "embed", label: "Embed Text", icon: Code2 },
            { value: "metadata", label: "Metadata", icon: Tag },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-700 px-4 py-3 text-xs font-medium text-gray-500 bg-transparent hover:text-gray-700"
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="chunk" className="m-0 p-5">
            <div className="text-xs text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100 whitespace-pre-wrap">
              {result.textContent || result.excerpt}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
              <FileText className="size-3" />
              <span>{result.documentFilename}</span>
              <span>·</span>
              <span>{datasetLabel}</span>
              <span>·</span>
              <span>Page {result.pageNumber ?? "—"}</span>
            </div>
          </TabsContent>

          <TabsContent value="embed" className="m-0 p-5">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Embed Representation</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium capitalize">
                {result.embeddingMode}
              </span>
              {(result.summaryModel || result.embeddingModel) && (
                <span className="text-xs text-gray-400">
                  {result.summaryModel ?? result.embeddingModel}
                </span>
              )}
            </div>
            <div className="text-xs text-indigo-800 bg-indigo-50 rounded-xl p-4 leading-relaxed border border-indigo-100 whitespace-pre-wrap">
              {result.embedText || result.textContent || result.excerpt}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              This is the text sent through retrieval indexing. It may differ from the raw chunk content when summarisation was applied.
            </p>
          </TabsContent>

          <TabsContent value="metadata" className="m-0 p-5">
            <div className="rounded-xl border border-gray-100 overflow-hidden mb-3">
              {[
                { k: "chunk_id", v: result.chunkId },
                { k: "document_id", v: result.documentId },
                { k: "dataset_ids", v: result.datasetIds.join(", ") || "—" },
                { k: "document", v: result.documentFilename },
                { k: "file_type", v: result.documentFileType.toUpperCase() },
                { k: "chunk_index", v: String(result.chunkIndex) },
                { k: "content_types", v: result.contentTypes.join(", ") || "—" },
                { k: "source_page", v: result.pageNumber?.toString() ?? "—" },
                { k: "section_title", v: getRetrievalSectionTitle(result) },
                { k: "token_count", v: String(getRetrievalTokenCount(result)) },
                { k: "embedding_mode", v: result.embeddingMode },
                { k: "language", v: getRetrievalLanguage(result) },
                { k: "score", v: result.score.toFixed(6) },
                { k: "vector_store", v: result.vectorStore ?? "—" },
                { k: "source_url", v: result.sourceUrl ?? "—" },
              ].map((field, index) => (
                <div
                  key={field.k}
                  className={cn(
                    "flex items-center gap-4 px-4 py-2.5 text-xs",
                    index % 2 === 0 ? "bg-gray-50/60" : "bg-white",
                  )}
                >
                  <span className="font-mono text-indigo-600 w-32 flex-shrink-0">{field.k}</span>
                  <span className="text-gray-700 break-all">{field.v}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span key={`${result.chunkId}-${tag}`} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Tag className="size-2.5" />
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No additional tags available.</span>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}
