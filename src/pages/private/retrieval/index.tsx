import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import { useDatasets } from "@/core/api/hooks";
import { fetchProviderSettings } from "@/core/settings";
import {
  mapBackendGroundedAnswerResponse,
  mapBackendRetrievalSearchDebug,
  mapBackendRetrievalSearchHit,
  type TBackendGroundedAnswerResponse,
  type TBackendRetrievalSearchResponse,
  type TGroundedAnswerResponse,
  type TRetrievalQueryExpansionMode,
  type TRetrievalSearchDebug,
  type TRetrievalSearchHit,
  type TRetrievalSearchRequest,
} from "@/core/retrieval";
import { SEARCH_MODES, type RetrievalSearchModeId } from "./options";
import { RetrievalResultsArea } from "./results-area";
import { RetrievalSearchPanel } from "./search-panel";

/** Shared with every other page that needs the dataset picker, so SWR serves
 *  them all from one cached response instead of refetching per navigation. */
const DATASET_PICKER_PARAMS: Record<string, string> = {
  include_documents: "false",
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

export default function RetrievalTestPage() {
  const navigate = useNavigate();

  const datasetResource = useDatasets(DATASET_PICKER_PARAMS);
  const datasets = datasetResource.items;
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [results, setResults] = useState<TRetrievalSearchHit[] | null>(null);
  const [groundedAnswer, setGroundedAnswer] =
    useState<TGroundedAnswerResponse | null>(null);
  const [selectedResult, setSelectedResult] =
    useState<TRetrievalSearchHit | null>(null);
  const [topK, setTopK] = useState([5]);
  const [candidateK, setCandidateK] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [searchMode, setSearchMode] =
    useState<RetrievalSearchModeId>("graph_mix");
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
  const isLoadingDatasets = datasetResource.isLoading;

  useEffect(() => {
    let cancelled = false;
    fetchProviderSettings()
      .then((settings) => {
        if (cancelled) return;
        const mode = String(settings.values.retrieval_default_search_mode ?? "");
        if (SEARCH_MODES.some((option) => option.id === mode)) {
          setSearchMode(mode as RetrievalSearchModeId);
        }

        const expansion = String(
          settings.values.retrieval_default_query_expansion ?? "none",
        );
        if (expansion === "none" || expansion === "multi_query") {
          setQueryExpansion(expansion);
        }

        const configuredTopK = Number(settings.values.retrieval_default_top_k);
        if (Number.isInteger(configuredTopK) && configuredTopK >= 1 && configuredTopK <= 20) {
          setTopK([configuredTopK]);
        }

        const configuredCandidateK = Number(
          settings.values.retrieval_default_candidate_k,
        );
        if (
          Number.isInteger(configuredCandidateK) &&
          configuredCandidateK >= 0 &&
          configuredCandidateK <= 200
        ) {
          setCandidateK(configuredCandidateK === 0 ? null : configuredCandidateK);
        }
        setDebugEnabled(
          settings.values.retrieval_default_debug_enabled === true,
        );
      })
      .catch(() => {
        // Retrieval remains usable with its local defaults when the optional
        // settings lookup is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const datasetNamesById = useMemo(
    () => new Map(datasets.map((item) => [item.id, item.name])),
    [datasets],
  );

  const buildRequest = (trimmedQuery: string): TRetrievalSearchRequest => ({
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
  });

  const executeSearch = async (value = query) => {
    const trimmedQuery = value.trim();
    if (!trimmedQuery || searching || answering) {
      return;
    }

    setSearching(true);
    setCommittedQuery(trimmedQuery);
    setSelectedResult(null);
    setGroundedAnswer(null);
    setDebugInfo(null);
    setPageError("");
    setLastRunMode(searchMode);

    const startedAt = performance.now();

    try {
      const payload = buildRequest(trimmedQuery);

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

  const executeAnswer = async (value = query) => {
    const trimmedQuery = value.trim();
    if (!trimmedQuery || searching || answering) {
      return;
    }

    setAnswering(true);
    setCommittedQuery(trimmedQuery);
    setSelectedResult(null);
    setGroundedAnswer(null);
    setDebugInfo(null);
    setPageError("");
    setLastRunMode(searchMode);

    const startedAt = performance.now();

    try {
      const payload = buildRequest(trimmedQuery);
      const response = await backendApi.create<
        TBackendGroundedAnswerResponse,
        TRetrievalSearchRequest
      >("/retrieval/answer", payload);
      const mapped = mapBackendGroundedAnswerResponse(response);

      setGroundedAnswer(mapped);
      setResults(mapped.hits);
      setDebugInfo(mapped.retrievalDebug);
      setLatency(Math.round(performance.now() - startedAt));
    } catch (error) {
      setResults([]);
      setLatency(Math.round(performance.now() - startedAt));
      setPageError(
        getApiErrorMessage(error, "Could not generate a grounded answer."),
      );
    } finally {
      setAnswering(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setCommittedQuery("");
    setResults(null);
    setSelectedResult(null);
    setGroundedAnswer(null);
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
          answering={answering}
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
          onAnswer={executeAnswer}
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
          groundedAnswer={groundedAnswer}
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
