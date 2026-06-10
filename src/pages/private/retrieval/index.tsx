import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  mapBackendRetrievalSearchDebug,
  mapBackendRetrievalSearchHit,
  type TBackendRetrievalSearchResponse,
  type TRetrievalQueryExpansionMode,
  type TRetrievalSearchDebug,
  type TRetrievalSearchHit,
  type TRetrievalSearchRequest,
} from "@/core/retrieval";
import type { RetrievalSearchModeId } from "./options";
import { RetrievalResultsArea } from "./results-area";
import { RetrievalSearchPanel } from "./search-panel";

export default function RetrievalTestPage() {
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [results, setResults] = useState<TRetrievalSearchHit[] | null>(null);
  const [selectedResult, setSelectedResult] =
    useState<TRetrievalSearchHit | null>(null);
  const [topK, setTopK] = useState([5]);
  const [candidateK, setCandidateK] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] =
    useState<RetrievalSearchModeId>("semantic");
  const [queryExpansion, setQueryExpansion] =
    useState<TRetrievalQueryExpansionMode>("none");
  const [lastRunMode, setLastRunMode] =
    useState<RetrievalSearchModeId | null>(null);
  const [dataset, setDataset] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [latency, setLatency] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugInfo, setDebugInfo] =
    useState<TRetrievalSearchDebug | null>(null);
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
      setDebugInfo(
        response.debug ? mapBackendRetrievalSearchDebug(response.debug) : null,
      );
      setLatency(Math.round(performance.now() - startedAt));
    } catch (error) {
      setResults([]);
      setLatency(Math.round(performance.now() - startedAt));
      setPageError(
        getApiErrorMessage(error, "Could not run retrieval search."),
      );
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
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Retrieval Test" />

      <div className="flex flex-1 flex-col overflow-hidden">
        <RetrievalSearchPanel
          datasets={datasets}
          query={query}
          committedQuery={committedQuery}
          results={results}
          latency={latency}
          searching={searching}
          isLoadingDatasets={isLoadingDatasets}
          searchMode={searchMode}
          lastRunMode={lastRunMode}
          queryExpansion={queryExpansion}
          dataset={dataset}
          contentTypeFilter={contentTypeFilter}
          candidateK={candidateK}
          topK={topK}
          showFilters={showFilters}
          debugEnabled={debugEnabled}
          debugInfo={debugInfo}
          pageError={pageError}
          onQueryChange={setQuery}
          onSearch={executeSearch}
          onClear={clearSearch}
          onSearchModeChange={setSearchMode}
          onDatasetChange={setDataset}
          onContentTypeFilterChange={setContentTypeFilter}
          onQueryExpansionChange={setQueryExpansion}
          onCandidateKChange={setCandidateK}
          onTopKChange={setTopK}
          onShowFiltersChange={setShowFilters}
          onDebugEnabledChange={setDebugEnabled}
        />

        <RetrievalResultsArea
          results={results}
          searching={searching}
          committedQuery={committedQuery}
          selectedResult={selectedResult}
          datasetNamesById={datasetNamesById}
          onSelectResult={setSelectedResult}
          onOpenDocument={(documentId) => navigate(`/documents/${documentId}`)}
        />
      </div>
    </div>
  );
}
