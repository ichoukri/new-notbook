import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { ContentTypeBadge, ModeBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDocumentSearchHit,
  getChunkEmbeddingMode,
  getChunkSectionTitle,
  getChunkTokenCount,
  getDocumentChunkCount,
  getDocumentContentTypeCounts,
  getDocumentDatasetId,
  getDocumentLogs,
  getDocumentMode,
  getDocumentPageCount,
  getDocumentPreviewText,
  getDocumentStatusValue,
  getDocumentUploadedAtLabel,
  getDocumentUploaderLabel,
  mapBackendDocumentSearchHit,
} from "@/core/documents";
import { type TBackendDataset, formatFileSize, mapBackendDataset } from "@/core/datasets";
import {
  type TBackendChunk,
  type TBackendDocument,
  getIngestionMetrics,
  mapBackendChunk,
  mapBackendDocument,
} from "@/core/ingestions";
import { useGlobalStore } from "@/core/global-store/index";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  User,
} from "lucide-react";

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useGlobalStore((state) => state.user);

  const [document, setDocument] = useState<ReturnType<typeof mapBackendDocument> | null>(null);
  const [datasetName, setDatasetName] = useState("Unknown Dataset");
  const [chunks, setChunks] = useState<ReturnType<typeof mapBackendChunk>[]>([]);
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<ReturnType<typeof mapBackendDocumentSearchHit>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChunks, setIsLoadingChunks] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      if (!id) {
        setPageError("Missing document identifier.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const response = await backendApi.get<TBackendDocument>(`/documents/${id}`);
        if (!cancelled) {
          setDocument(mapBackendDocument(response));
        }
      } catch (error) {
        if (!cancelled) {
          setDocument(null);
          setPageError(getApiErrorMessage(error, "Could not load this document."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const loadChunks = async () => {
      if (!document?.id) {
        setChunks([]);
        setIsLoadingChunks(false);
        return;
      }

      setIsLoadingChunks(true);

      try {
        const response = await backendApi.findMany<TBackendChunk>(
          `/chunks/document/${document.id}`,
          {
            active_only: "true",
          },
        );

        if (!cancelled) {
          setChunks(response.map(mapBackendChunk));
        }
      } catch {
        if (!cancelled) {
          setChunks([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingChunks(false);
        }
      }
    };

    void loadChunks();

    return () => {
      cancelled = true;
    };
  }, [document?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadDataset = async () => {
      const datasetId = document ? getDocumentDatasetId(document) : null;
      if (!datasetId) {
        setDatasetName("Unknown Dataset");
        return;
      }

      try {
        const response = await backendApi.get<TBackendDataset>(`/datasets/${datasetId}`);
        if (!cancelled) {
          setDatasetName(mapBackendDataset(response).name);
        }
      } catch {
        if (!cancelled) {
          setDatasetName(datasetId);
        }
      }
    };

    void loadDataset();

    return () => {
      cancelled = true;
    };
  }, [document]);

  useEffect(() => {
    setQuery("");
    setSearchHits([]);
  }, [document?.id]);

  const metrics = useMemo(
    () => (document ? getIngestionMetrics(document) : null),
    [document],
  );
  const logs = useMemo(
    () => (document ? getDocumentLogs(document) : []),
    [document],
  );
  const contentTypeCounts = useMemo(
    () => getDocumentContentTypeCounts(chunks),
    [chunks],
  );
  const previewText = useMemo(
    () => getDocumentPreviewText(chunks),
    [chunks],
  );

  const pageCount = document ? getDocumentPageCount(document, chunks) : null;
  const chunkCount = document ? getDocumentChunkCount(document, chunks) : 0;
  const uploaderLabel = document
    ? getDocumentUploaderLabel(document, currentUser)
    : "Unknown User";

  const handleRetry = async () => {
    if (!document || isRetrying) {
      return;
    }

    const datasetId = getDocumentDatasetId(document);
    if (!datasetId) {
      toast.error("This document is not linked to a dataset.");
      return;
    }

    setIsRetrying(true);

    try {
      const response = await backendApi.create<{ message: string; data: TBackendDocument }, undefined>(
        `/documents/${datasetId}/confirm?document_id=${document.id}`,
        undefined,
      );
      setDocument(mapBackendDocument(response.data));
      toast.success("Ingestion restarted.");
      navigate(`/ingestions/auto?document_id=${document.id}&dataset_id=${datasetId}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not restart ingestion."));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSearch = async () => {
    if (!document?.id || isSearching) {
      return;
    }

    if (!query.trim()) {
      setSearchHits([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await backendApi.findMany<TBackendDocumentSearchHit>(
        `/documents/${document.id}/search`,
        {
          query: query.trim(),
          limit: "6",
        },
      );
      setSearchHits(response.map(mapBackendDocumentSearchHit));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not run retrieval preview."));
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <Topbar title="Document" breadcrumbs={[{ label: "Documents", path: "/documents" }]} />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            Loading document…
          </div>
        </main>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <Topbar title="Document" breadcrumbs={[{ label: "Documents", path: "/documents" }]} />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="size-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Document unavailable</h2>
            <p className="text-sm text-gray-500 mb-6">
              {pageError || "Could not load this document."}
            </p>
            <Button onClick={() => navigate("/documents")}>Back to Documents</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar
        title={document.filename}
        breadcrumbs={[{ label: "Documents", path: "/documents" }]}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="size-6 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-gray-900 mb-2 truncate">
                    {document.filename}
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500">
                    <StatusBadge status={getDocumentStatusValue(document.processingStatus)} />
                    <ModeBadge mode={getDocumentMode(document)} />
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      {document.fileType.toUpperCase()} · {formatFileSize(document.fileSize)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="size-3.5" />
                      {pageCount?.toLocaleString() ?? "—"} pages · {chunkCount.toLocaleString()} chunks
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {getDocumentUploadedAtLabel(document)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="size-3.5" />
                      {uploaderLabel}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Database className="size-3.5" />
                      {datasetName}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => void handleRetry()} disabled={isRetrying}>
                  {isRetrying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Re-run Ingestion
                </Button>
                <Button size="sm" variant="outline" className="gap-2" disabled>
                  Guided Editor Unavailable
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="bg-white border border-gray-100 shadow-sm rounded-xl p-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chunks">Chunks ({chunkCount})</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="retrieval">Retrieval Preview</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Pages", value: pageCount?.toLocaleString() ?? "—", icon: FileText },
                  { label: "Chunks", value: chunkCount.toLocaleString(), icon: Layers },
                  { label: "File Size", value: formatFileSize(document.fileSize), icon: FileText },
                  { label: "Mode", value: getDocumentMode(document) === "auto" ? "Auto" : "Guided", icon: Clock },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Content Types Detected</h3>
                <div className="flex gap-3 flex-wrap">
                  {contentTypeCounts.length > 0 ? (
                    contentTypeCounts.map((contentType) => (
                      <div key={contentType.type} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                        <ContentTypeBadge type={contentType.type} />
                        <span className="text-xs text-gray-500">
                          {contentType.count.toLocaleString()} chunks
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No chunk content has been generated yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Extracted Content Preview</h3>
                <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed h-40 overflow-y-auto">
                  {previewText ?? "Preview will appear once chunk content is available."}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="chunks" className="mt-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">#</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Type</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Section</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Page</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Tokens</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Embed Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoadingChunks ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="size-4 animate-spin" />
                            Loading chunks…
                          </div>
                        </td>
                      </tr>
                    ) : chunks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                          No chunks are available for this document yet.
                        </td>
                      </tr>
                    ) : (
                      chunks.map((chunk) => (
                        <tr key={chunk.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3.5 text-sm text-gray-500">{chunk.chunkIndex + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              {chunk.contentTypes.map((type) => (
                                <ContentTypeBadge key={`${chunk.id}-${type}`} type={type} />
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700">
                            {getChunkSectionTitle(chunk)}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-500">
                            {chunk.pageNumber ?? "—"}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700">
                            {getChunkTokenCount(chunk).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-indigo-600 font-medium capitalize">
                            {getChunkEmbeddingMode(chunk)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  {[
                    { key: "document_id", value: document.id },
                    { key: "dataset_id", value: getDocumentDatasetId(document) ?? "—" },
                    { key: "filename", value: document.filename },
                    { key: "hash", value: document.hash },
                    { key: "file_type", value: document.fileType },
                    { key: "file_size", value: formatFileSize(document.fileSize) },
                    { key: "pages", value: pageCount?.toString() ?? "—" },
                    { key: "chunks", value: chunkCount.toString() },
                    { key: "ingestion_mode", value: getDocumentMode(document) },
                    { key: "status", value: document.processingStatus },
                    { key: "uploaded_at", value: getDocumentUploadedAtLabel(document) },
                    { key: "source_url", value: document.sourceUrl ?? "—" },
                    { key: "task_id", value: document.taskId ?? "—" },
                    { key: "embedding_model", value: metrics?.embeddingModel ?? "—" },
                    { key: "summary_model", value: metrics?.summaryModel ?? "—" },
                    { key: "vector_store", value: metrics?.vectorStore ?? "—" },
                  ].map((field, index) => (
                    <div key={field.key} className={`flex items-center gap-4 px-4 py-2.5 ${index % 2 === 0 ? "bg-gray-50/50" : "bg-white"}`}>
                      <span className="text-xs font-mono text-indigo-600 w-40 flex-shrink-0">{field.key}</span>
                      <span className="text-sm text-gray-700 break-all">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="mt-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="space-y-4">
                  {[
                    { label: "Dataset", value: datasetName },
                    { label: "Owner", value: uploaderLabel },
                    { label: "User ID", value: document.userId },
                    { label: "Tenant ID", value: document.tenantId },
                    { label: "Access Model", value: "Inherited from backend dataset permissions" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 gap-4">
                      <span className="text-sm text-gray-500">{row.label}</span>
                      <span className="text-sm font-medium text-gray-800 break-all text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="retrieval" className="mt-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSearch();
                      }
                    }}
                    placeholder="Search within this document..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <Button size="sm" onClick={() => void handleSearch()} disabled={isSearching || !query.trim()}>
                    {isSearching ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                  </Button>
                </div>

                {searchHits.length === 0 && !isSearching ? (
                  <div className="p-8 text-center text-sm text-gray-400 bg-gray-50 rounded-xl">
                    Enter a query above to preview retrieval across this document’s stored chunks.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchHits.map((hit) => (
                      <div key={hit.chunkId} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
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
                        <p className="text-sm text-gray-700 leading-relaxed">{hit.excerpt}</p>
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
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">Ingestion History</h3>
                </div>
                <div className="p-5">
                  {logs.length === 0 ? (
                    <p className="text-sm text-gray-400">No ingestion logs are available yet.</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                      <div className="space-y-4">
                        {logs.map((log) => (
                          <div key={`${log.timestamp}-${log.message}`} className="flex items-start gap-4 pl-10 relative">
                            <div
                              className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white shadow-sm mt-0.5 ${
                                log.level === "error"
                                  ? "bg-red-400"
                                  : log.level === "warn"
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                              }`}
                            />
                            <div>
                              <p className="text-sm text-gray-700">{log.message}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {log.timestamp}
                                {log.step ? ` • ${log.step}` : ""}
                              </p>
                            </div>
                            <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 ml-auto flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
