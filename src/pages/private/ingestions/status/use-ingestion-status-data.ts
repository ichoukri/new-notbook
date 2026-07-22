import { useEffect, useState } from "react";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendChunk,
  type TBackendDocument,
  type TIngestionChunk,
  type TIngestionDocument,
  buildDocumentStatusStreamUrl,
  mapBackendChunk,
  mapBackendDocument,
  shouldLoadIngestionChunksForStatus,
} from "@/core/ingestions";

type UseIngestionStatusDataParams = {
  documentId: string;
  requestedDatasetId: string;
};

export function useIngestionStatusData({
  documentId,
  requestedDatasetId,
}: UseIngestionStatusDataParams) {
  const [document, setDocument] = useState<TIngestionDocument | null>(null);
  const [dataset, setDataset] = useState<TDataset | null>(null);
  const [chunks, setChunks] = useState<TIngestionChunk[]>([]);
  const [chunksReloadKey, setChunksReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [pageError, setPageError] = useState("");
  const [partitionOutput, setPartitionOutput] = useState<Record<
    string,
    unknown
  > | null>(null);

  const effectiveDatasetId =
    requestedDatasetId || document?.datasetIds[0] || "";
  const chunkDocumentId = document?.id ?? "";
  const chunkProcessingStatus = document?.processingStatus ?? "";
  const chunkUpdatedAt = document?.updatedAt ?? "";

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      if (!documentId) {
        setDocument(null);
        setIsLoading(false);
        setPageError(
          "Missing document identifier. Start ingestion from the upload flow.",
        );
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const response = await backendApi.get<TBackendDocument>(
          `/documents/${documentId}`,
        );
        if (!cancelled) {
          setDocument(mapBackendDocument(response));
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            getApiErrorMessage(error, "Could not load ingestion status."),
          );
          setDocument(null);
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
  }, [documentId]);

  useEffect(() => {
    let cancelled = false;

    const loadDataset = async () => {
      if (!effectiveDatasetId) {
        setDataset(null);
        return;
      }

      try {
        const response = await backendApi.get<TBackendDataset>(
          `/datasets/${effectiveDatasetId}`,
        );
        if (!cancelled) {
          setDataset(mapBackendDataset(response));
        }
      } catch {
        if (!cancelled) {
          setDataset(null);
        }
      }
    };

    void loadDataset();

    return () => {
      cancelled = true;
    };
  }, [effectiveDatasetId]);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let disposed = false;
    const stream = new EventSource(
      buildDocumentStatusStreamUrl({
        documentIds: [documentId],
      }),
      { withCredentials: true },
    );

    const handleStatus = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as TBackendDocument;
        if (!disposed && payload.id === documentId) {
          setDocument(mapBackendDocument(payload));
          setPageError("");
        }
      } catch {
        // Ignore malformed messages and keep the stream alive.
      }
    };

    const handleDelete = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { id?: string };
        if (!disposed && payload.id === documentId) {
          setPageError(
            "This document was deleted while ingestion was in progress.",
          );
        }
      } catch {
        // Ignore malformed messages and keep the stream alive.
      }
    };

    stream.addEventListener("document_status", handleStatus as EventListener);
    stream.addEventListener("document_deleted", handleDelete as EventListener);

    stream.onerror = () => {
      if (!disposed) {
        void backendApi
          .get<TBackendDocument>(`/documents/${documentId}`)
          .then((response) => {
            setDocument(mapBackendDocument(response));
          })
          .catch(() => {
            // Ignore transient stream refresh failures.
          });
      }
    };

    return () => {
      disposed = true;
      stream.close();
    };
  }, [documentId]);

  useEffect(() => {
    if (!chunkDocumentId) {
      setChunks([]);
      return;
    }

    if (!shouldLoadIngestionChunksForStatus(chunkProcessingStatus)) {
      return;
    }

    let cancelled = false;

    const loadChunks = async () => {
      setIsLoadingChunks(true);

      try {
        const response = await backendApi.findMany<TBackendChunk>(
          `/chunks/document/${chunkDocumentId}`,
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
  }, [
    chunkDocumentId,
    chunkProcessingStatus,
    chunkUpdatedAt,
    chunksReloadKey,
  ]);

  useEffect(() => {
    if (!document?.id) {
      setPartitionOutput(null);
      return;
    }
    if (document.processingStatus !== "partitioning_awaiting_approval") {
      setPartitionOutput(null);
      return;
    }

    let cancelled = false;
    backendApi
      .get<{ stage: string; output: Record<string, unknown> | null }>(
        `/documents/${document.id}/stages/partition/output`,
      )
      .then((response) => {
        if (!cancelled) setPartitionOutput(response.output ?? null);
      })
      .catch(() => {
        if (!cancelled) setPartitionOutput(null);
      });

    return () => {
      cancelled = true;
    };
  }, [document?.id, document?.processingStatus]);

  return {
    document,
    setDocument,
    dataset,
    chunks,
    setChunks,
    reloadChunks: () => setChunksReloadKey((key) => key + 1),
    isLoading,
    isLoadingChunks,
    pageError,
    partitionOutput,
    setPartitionOutput,
    effectiveDatasetId,
  };
}
