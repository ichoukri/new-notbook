import { Code2, Database, Filter, Search, Sparkles } from "lucide-react";
import type { TRetrievalSearchHit } from "@/core/retrieval";
import { cn } from "@/lib/utils";
import { PreviewPanel, ResultCard } from "./result-components";

type RetrievalResultsAreaProps = {
  results: TRetrievalSearchHit[] | null;
  searching: boolean;
  committedQuery: string;
  selectedResult: TRetrievalSearchHit | null;
  datasetNamesById: Map<string, string>;
  onSelectResult: (result: TRetrievalSearchHit | null) => void;
  onOpenDocument: (documentId: string) => void;
};

export function RetrievalResultsArea({
  results,
  searching,
  committedQuery,
  selectedResult,
  datasetNamesById,
  onSelectResult,
  onOpenDocument,
}: RetrievalResultsAreaProps) {
  const toggleResult = (result: TRetrievalSearchHit) => {
    onSelectResult(
      selectedResult?.chunkId === result.chunkId ? null : result,
    );
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {!results && !searching && <RetrievalReadyState />}

      {searching && <RetrievalLoadingState />}

      {results && !searching && (
        <div className="flex flex-1 overflow-hidden">
          <div
            className={cn(
              "flex flex-col overflow-y-auto transition-all",
              selectedResult ? "w-[54%]" : "flex-1",
            )}
          >
            <div className="space-y-3 p-5">
              {results.length === 0 ? (
                <RetrievalEmptyResultsState />
              ) : (
                results.map((result, index) => (
                  <ResultCard
                    key={result.chunkId}
                    result={result}
                    rank={index + 1}
                    query={committedQuery}
                    selected={selectedResult?.chunkId === result.chunkId}
                    datasetNamesById={datasetNamesById}
                    onClick={() => toggleResult(result)}
                    onOpenDocument={() => onOpenDocument(result.documentId)}
                  />
                ))
              )}
            </div>
          </div>

          {selectedResult && (
            <div className="flex w-[46%] flex-shrink-0 flex-col overflow-hidden border-l border-gray-100 bg-white">
              <PreviewPanel
                result={selectedResult}
                datasetNamesById={datasetNamesById}
                onClose={() => onSelectResult(null)}
                onOpenDocument={() => onOpenDocument(selectedResult.documentId)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RetrievalReadyState() {
  const features = [
    {
      icon: Sparkles,
      label: "Semantic search",
      desc: "Find relevant content by meaning",
    },
    {
      icon: Filter,
      label: "Metadata filters",
      desc: "Narrow results by type or dataset",
    },
    {
      icon: Code2,
      label: "Inspect embed text",
      desc: "Compare raw vs embed representation",
    },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-10">
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50">
        <Search className="size-9 text-indigo-300" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-gray-700">
        Ready to search
      </h3>
      <p className="mb-8 max-w-sm text-center text-sm text-gray-400">
        Enter a query above to test retrieval across your indexed content.
        Results show chunk scores, snippets, and metadata.
      </p>

      <div className="grid w-full max-w-xl grid-cols-3 gap-3">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"
          >
            <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-xl bg-indigo-50">
              <feature.icon className="size-4 text-indigo-500" />
            </div>
            <p className="mb-0.5 text-xs font-semibold text-gray-700">
              {feature.label}
            </p>
            <p className="text-xs text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RetrievalLoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="size-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Database className="size-5 text-indigo-400" />
        </div>
      </div>
      <p className="text-sm text-gray-500">Querying indexed chunks...</p>
    </div>
  );
}

function RetrievalEmptyResultsState() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
      <Search className="mx-auto mb-3 size-8 text-gray-200" />
      <p className="text-sm font-medium text-gray-600">No results found</p>
      <p className="mt-1 text-xs text-gray-400">
        Try adjusting your query, filters, or increasing Top-K.
      </p>
    </div>
  );
}
