import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
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
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar
        title={document.filename}
        breadcrumbs={[{ label: "Documents", path: "/documents" }]}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-5">
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
          />

          <DocumentFailureAlert
            message={failureMessage}
            stage={failureStage}
            traceback={failureTraceback}
          />

          <Tabs defaultValue="overview">
            <TabsList className="bg-white border border-gray-100 shadow-sm rounded-xl p-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chunks">Chunks ({chunkCount})</TabsTrigger>
              <TabsTrigger value="retrieval">Retrieval Preview</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <DocumentOverviewTab
                document={document}
                pageCount={pageCount}
                chunkCount={chunkCount}
                contentTypeCounts={contentTypeCounts}
                previewText={previewText}
              />
            </TabsContent>

            <TabsContent value="chunks" className="mt-4">
              <DocumentChunksTab
                chunks={chunks}
                expandedChunks={expandedChunks}
                isLoadingChunks={isLoadingChunks}
                onToggleChunk={toggleChunk}
              />
            </TabsContent>

            <TabsContent value="retrieval" className="mt-4">
              <DocumentRetrievalTab
                query={query}
                searchHits={searchHits}
                isSearching={isSearching}
                onQueryChange={setQuery}
                onSearch={() => void handleSearch()}
              />
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              <DocumentMetadataTab
                document={document}
                pageCount={pageCount}
                chunkCount={chunkCount}
                metrics={metrics}
              />
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
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
