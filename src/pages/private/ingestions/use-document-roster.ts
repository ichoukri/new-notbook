import { useEffect, useMemo, useState } from "react";
import { backendApi } from "@/core/api";
import { dedupeDocumentIds } from "@/core/batches";
import {
  type TBackendDocument,
  type TBackendStreamSubscription,
  type TIngestionDocument,
  buildDocumentStatusStreamUrl,
  mapBackendDocument,
  needsStreamSubscription,
} from "@/core/ingestions";

/**
 * Live state for a fixed set of documents over a single SSE connection.
 *
 * Shared by the guided review queue and the auto batch view: both need "what is
 * every document in this batch doing right now", and neither should open one
 * connection per document.
 */
export function useDocumentRoster({
  documentIds,
  datasetId,
}: {
  documentIds: string[];
  datasetId: string;
}) {
  const [documents, setDocuments] = useState<Map<string, TIngestionDocument>>(
    () => new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  // Callers rebuild the id array each render; collapse it to a stable identity
  // so the stream is not torn down and reopened on every commit. Deduped
  // because content-hash matching can map several files to one document.
  const trackedKey = dedupeDocumentIds(documentIds).join(",");
  const trackedIds = useMemo(
    () => trackedKey.split(",").filter(Boolean),
    [trackedKey],
  );

  useEffect(() => {
    if (trackedIds.length === 0) return;

    let disposed = false;
    let stream: EventSource | null = null;
    const tracked = new Set(trackedIds);

    const handleStatus = (event: MessageEvent<string>) => {
      if (disposed) return;
      try {
        const payload = JSON.parse(event.data) as TBackendDocument;
        if (!payload.id || !tracked.has(payload.id)) return;
        const mapped = mapBackendDocument(payload);
        setDocuments((prev) => {
          const next = new Map(prev);
          next.set(mapped.id, mapped);
          return next;
        });
        setStreamError("");
      } catch {
        // Ignore malformed messages and keep the stream alive.
      }
    };

    const handleDeleted = (event: MessageEvent<string>) => {
      if (disposed) return;
      try {
        const payload = JSON.parse(event.data) as { id?: string };
        if (!payload.id || !tracked.has(payload.id)) return;
        // Drop it from the roster rather than leaving a row pointing at a
        // document that no longer exists. It stays in trackedIds, so the batch
        // reports it as unreported instead of silently shrinking.
        setDeletedIds((prev) => {
          if (prev.has(payload.id as string)) return prev;
          return new Set(prev).add(payload.id as string);
        });
        setDocuments((prev) => {
          if (!prev.has(payload.id as string)) return prev;
          const next = new Map(prev);
          next.delete(payload.id as string);
          return next;
        });
      } catch {
        // Ignore malformed messages and keep the stream alive.
      }
    };

    const handleConnected = () => {
      if (!disposed) setIsConnected(true);
    };

    const openStream = (subscription: string | null) => {
      if (disposed) return;
      stream = new EventSource(
        buildDocumentStatusStreamUrl({
          documentIds: trackedIds,
          datasetId,
          subscription,
        }),
        { withCredentials: true },
      );
      stream.addEventListener("connected", handleConnected);
      stream.addEventListener("document_status", handleStatus as EventListener);
      stream.addEventListener("document_deleted", handleDeleted as EventListener);
      stream.onerror = () => {
        if (!disposed) {
          setIsConnected(false);
          setStreamError(
            "Live updates interrupted — reconnecting. Statuses may lag.",
          );
        }
      };
    };

    // A roster too large for the URL is registered server-side first, so the
    // stream still filters to exactly these documents instead of falling back
    // to a dataset-wide feed that can omit them.
    if (needsStreamSubscription(trackedIds)) {
      void backendApi
        .create<TBackendStreamSubscription, { document_ids: string[] }>(
          "/documents/stream/subscriptions",
          { document_ids: trackedIds },
        )
        .then((response) => openStream(response.subscription))
        .catch(() => {
          if (disposed) return;
          setStreamError(
            "Could not register this batch for live updates. Statuses may be incomplete.",
          );
          openStream(null);
        });
    } else {
      openStream(null);
    }

    return () => {
      disposed = true;
      stream?.close();
    };
  }, [trackedIds, datasetId]);

  // Mutations return the updated document; feeding it in here updates the view
  // immediately instead of waiting for the same change to arrive over the
  // stream.
  const applyDocument = (document: TIngestionDocument) => {
    setDocuments((prev) => {
      const next = new Map(prev);
      next.set(document.id, document);
      return next;
    });
  };

  return {
    documents,
    trackedIds,
    deletedIds,
    isConnected,
    streamError,
    applyDocument,
  };
}
