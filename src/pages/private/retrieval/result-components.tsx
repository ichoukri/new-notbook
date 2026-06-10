import { ArrowUpRight, ChevronRight, Code2, FileText, Tag, X } from "lucide-react";
import { ContentTypeBadge } from "@/components/app/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getRetrievalLanguage,
  getRetrievalPrimaryContentType,
  getRetrievalSectionTitle,
  getRetrievalTags,
  getRetrievalTokenCount,
  type TRetrievalSearchHit,
} from "@/core/retrieval";
import { cn } from "@/lib/utils";
import { highlightParts } from "./highlight";

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const styles =
    pct >= 90
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : pct >= 75
        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
        : pct >= 60
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-red-50 text-red-700 border-red-200";

  return (
    <span
      className={cn(
        "text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums",
        styles,
      )}
    >
      {score.toFixed(3)}
    </span>
  );
}

export function ResultCard({
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
    result.datasetIds
      .map((datasetId) => datasetNamesById.get(datasetId))
      .find(Boolean) ?? "Unknown Dataset";

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
          pct >= 90
            ? "bg-emerald-400"
            : pct >= 75
              ? "bg-indigo-400"
              : pct >= 60
                ? "bg-amber-400"
                : "bg-red-300",
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
                  p.{result.pageNumber ?? "—"} ·{" "}
                  {getRetrievalTokenCount(result)} tokens
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
                selected
                  ? "text-indigo-400 rotate-90"
                  : "text-gray-200 group-hover:text-gray-400",
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 pl-9">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 90
                  ? "bg-emerald-400"
                  : pct >= 75
                    ? "bg-indigo-400"
                    : pct >= 60
                      ? "bg-amber-400"
                      : "bg-red-300",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{pct}% relevance</span>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed pl-9 line-clamp-3">
          {parts.map((part, index) =>
            index % 2 === 1 ? (
              <mark
                key={`${part}-${index}`}
                className="bg-indigo-100 text-indigo-800 rounded px-0.5 font-medium not-italic"
              >
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
              <span
                key={`${result.chunkId}-${tag}`}
                className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
              >
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

export function PreviewPanel({
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
  const datasetLabel =
    result.datasetIds
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
          <p className="text-sm font-semibold text-gray-900">
            {getRetrievalSectionTitle(result)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Chunk #{result.chunkIndex + 1} · Page {result.pageNumber ?? "—"} ·{" "}
            {getRetrievalTokenCount(result)} tokens
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
              pct >= 90
                ? "text-emerald-700"
                : pct >= 75
                  ? "text-indigo-700"
                  : "text-amber-700",
            )}
          >
            {pct}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              pct >= 90
                ? "bg-emerald-500"
                : pct >= 75
                  ? "bg-indigo-500"
                  : "bg-amber-500",
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
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Embed Representation
              </span>
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
              This is the text sent through retrieval indexing. It may differ
              from the raw chunk content when summarisation was applied.
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
                  <span className="font-mono text-indigo-600 w-32 flex-shrink-0">
                    {field.k}
                  </span>
                  <span className="text-gray-700 break-all">{field.v}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={`${result.chunkId}-${tag}`}
                      className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1"
                    >
                      <Tag className="size-2.5" />
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">
                    No additional tags available.
                  </span>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}
