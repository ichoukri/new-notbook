import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Braces,
  Eye,
  LayoutDashboard,
  Layers3,
  ScrollText,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { backendApi } from "@/core/api";
import { getApiErrorMessage, getApiErrorStatus } from "@/core/api/error";
import {
  type TBackendDocumentSearchHit,
  type TDocumentSearchHit,
  getDocumentChunkCount,
  getDocumentContentTypeCounts,
  getDocumentDatasetId,
  getDocumentLogs,
  getDocumentPageCount,
  getDocumentPreviewText,
  getDocumentUploaderLabel,
  mapBackendDocumentSearchHit,
} from "@/core/documents";
import { type TBackendDataset, mapBackendDataset } from "@/core/datasets";
import {
  type TBackendChunk,
  type TBackendDocument,
  type TIngestionChunk,
  type TIngestionDocument,
  getIngestionError,
  getIngestionErrorTraceback,
  getIngestionFailedStage,
  getIngestionMetrics,
  mapBackendChunk,
  mapBackendDocument,
} from "@/core/ingestions";
import { useGlobalStore } from "@/core/global-store/index";
import { DocumentChunksTab } from "./detail-components/document-chunks-tab";
import { DocumentPreviewTab } from "./detail-components/document-preview-tab";
import { DocumentDeleteDialog } from "./detail-components/document-delete-dialog";
import {
  DocumentFailureAlert,
  DocumentHeader,
} from "./detail-components/document-header";
import { DocumentLogsTab } from "./detail-components/document-logs-tab";
import { DocumentMetadataTab } from "./detail-components/document-metadata-tab";
import { DocumentOverviewTab } from "./detail-components/document-overview-tab";
import { DocumentRetrievalTab } from "./detail-components/document-retrieval-tab";
import {
  DocumentLoadingState,
  DocumentUnavailableState,
} from "./detail-components/document-states";

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useGlobalStore((state) => state.user);

  const [document, setDocument] = useState<TIngestionDocument | null>(null);
  const [datasetName, setDatasetName] = useState("Unknown Dataset");
  const [chunks, setChunks] = useState<TIngestionChunk[]>([]);
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<TDocumentSearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChunks, setIsLoadingChunks] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pageError, setPageError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
    setExpandedChunks(new Set());
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
  const failureMessage = useMemo(() => {
    if (!document) return null;
    if (document.processingStatus !== "failed") return null;
    // Prefer the structured error from processing_details (set by the backend
    // ingestion task). Fall back to the most-recent error log line, then a
    // generic default.
    const detailsError = getIngestionError(document);
    if (detailsError) return detailsError;
    const errorLog = [...logs].reverse().find((log) => log.level === "error");
    return errorLog?.message ?? "Ingestion failed. Re-run to try again.";
  }, [document, logs]);

  const failureTraceback = useMemo(
    () => (document ? getIngestionErrorTraceback(document) : null),
    [document],
  );
  const failureStage = useMemo(
    () => (document ? getIngestionFailedStage(document) : null),
    [document],
  );

  const pageCount = document ? getDocumentPageCount(document, chunks) : null;
  const chunkCount = document ? getDocumentChunkCount(document, chunks) : 0;
  const uploaderLabel = document
    ? getDocumentUploaderLabel(document, currentUser)
    : "Unknown User";

  const toggleChunk = (chunkId: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  };

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
      navigate(`/ingestions/status?document_id=${document.id}&dataset_id=${datasetId}`);
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        toast.info(
          getApiErrorMessage(error, "Ingestion is already running."),
        );
        navigate(`/ingestions/status?document_id=${document.id}&dataset_id=${datasetId}`);
      } else {
        toast.error(getApiErrorMessage(error, "Could not restart ingestion."));
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = async () => {
    if (!document?.id || isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await backendApi.get<{ url: string; filename: string }>(
        `/documents/${document.id}/source-url`,
      );
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not get download link."));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!document?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      await backendApi.delete("/documents", document.id);
      toast.success("Document deleted.");
      navigate("/documents");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete document."));
      setIsDeleting(false);
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
    return <DocumentLoadingState />;
  }

  if (!document) {
    return (
      <DocumentUnavailableState
        message={pageError || "Could not load this document."}
        onBack={() => navigate("/documents")}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f6fa]">
      <Topbar
        title={document.filename}
        breadcrumbs={[{ label: "Documents", path: "/documents" }]}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <DocumentHeader
            document={document}
            datasetName={datasetName}
            pageCount={pageCount}
            chunkCount={chunkCount}
            uploaderLabel={uploaderLabel}
            isDownloading={isDownloading}
            isRetrying={isRetrying}
            onDownload={() => void handleDownload()}
            onRetry={() => void handleRetry()}
            onDelete={() => setDeleteOpen(true)}
            onOpenDataset={() => {
              const datasetId = getDocumentDatasetId(document);
              if (datasetId) navigate(`/datasets/${datasetId}`);
            }}
          />

          <div className="mt-4">
            <DocumentFailureAlert
              message={failureMessage}
              stage={failureStage}
              traceback={failureTraceback}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5 gap-0">
            <div className="sticky top-0 z-10 -mx-1 overflow-x-auto border-b border-gray-200/80 bg-[#f5f6fa]/95 px-1 backdrop-blur-md">
              <TabsList
                variant="line"
                aria-label="Document sections"
                className="h-14 w-max min-w-full justify-start gap-1 bg-transparent p-0"
              >
                <DocumentTab value="overview" icon={LayoutDashboard} label="Overview" />
                <DocumentTab value="preview" icon={Eye} label="Source preview" />
                <DocumentTab
                  value="chunks"
                  icon={Layers3}
                  label="Chunks"
                  count={chunkCount}
                />
                <DocumentTab value="retrieval" icon={Search} label="Test retrieval" />
                <DocumentTab value="metadata" icon={Braces} label="Metadata" />
                <DocumentTab value="logs" icon={ScrollText} label="Activity" />
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-5">
              <DocumentOverviewTab
                document={document}
                pageCount={pageCount}
                chunkCount={chunkCount}
                contentTypeCounts={contentTypeCounts}
                previewText={previewText}
                metrics={metrics}
                isLoadingChunks={isLoadingChunks}
                onOpenPreview={() => setActiveTab("preview")}
                onOpenChunks={() => setActiveTab("chunks")}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-5">
              <DocumentPreviewTab document={document} chunks={chunks} />
            </TabsContent>

            <TabsContent value="chunks" className="mt-5">
              <DocumentChunksTab
                chunks={chunks}
                expandedChunks={expandedChunks}
                isLoadingChunks={isLoadingChunks}
                onToggleChunk={toggleChunk}
              />
            </TabsContent>

            <TabsContent value="retrieval" className="mt-5">
              <DocumentRetrievalTab
                query={query}
                searchHits={searchHits}
                isSearching={isSearching}
                onQueryChange={setQuery}
                onSearch={() => void handleSearch()}
              />
            </TabsContent>

            <TabsContent value="metadata" className="mt-5">
              <DocumentMetadataTab
                document={document}
                pageCount={pageCount}
                chunkCount={chunkCount}
                metrics={metrics}
              />
            </TabsContent>

            <TabsContent value="logs" className="mt-5">
              <DocumentLogsTab logs={logs} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <DocumentDeleteDialog
        open={deleteOpen}
        filename={document.filename}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteOpen(false);
        }}
        onDelete={() => void handleDelete()}
      />
    </div>
  );
}

function DocumentTab({
  value,
  icon: Icon,
  label,
  count,
}: {
  value: string;
  icon: typeof LayoutDashboard;
  label: string;
  count?: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className="group h-full flex-none gap-2 rounded-none px-4 text-[13px] font-semibold text-gray-500 after:bottom-0 after:h-0.5 after:bg-indigo-600 hover:text-gray-900 data-[state=active]:text-indigo-700"
    >
      <Icon className="size-4" />
      {label}
      {typeof count === "number" && (
        <span className="rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-gray-600 group-data-[state=active]:bg-indigo-100 group-data-[state=active]:text-indigo-700">
          {count.toLocaleString()}
        </span>
      )}
    </TabsTrigger>
  );
}
