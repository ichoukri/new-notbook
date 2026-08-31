import { useMemo } from "react";
import useSWR, { type KeyedMutator } from "swr";
import { backendApi, type TPaginatedResponse } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  mapBackendDataset,
  type TBackendDataset,
  type TDataset,
} from "@/core/datasets";
import {
  mapBackendDocument,
  mapBackendChunk,
  type TBackendChunk,
  type TBackendDocument,
  type TBackendDocumentStats,
  type TIngestionChunk,
  type TIngestionDocument,
} from "@/core/ingestions";

type Params = Record<string, string>;

type ResourceState<TMapped, TBackend = unknown> = {
  items: TMapped[];
  total: number;
  offset: number;
  limit: number;
  isLoading: boolean;
  isValidating: boolean;
  error: string;
  /** Revalidate from the server. */
  refresh: () => Promise<TPaginatedResponse<TBackend> | undefined>;
  /**
   * Write the cache directly, for optimistic updates after a mutation.
   *
   * Operates on the raw backend page — the hook maps to the UI shape on read
   * — so callers hand it the same objects the API returned.
   */
  mutate: KeyedMutator<TPaginatedResponse<TBackend>>;
};

const DEFAULT_LIST_META = {
  total: 0,
  offset: 0,
  limit: 0,
};

function normalizeParams(params?: Params): Params {
  return params ? { ...params } : {};
}

function useBackendList<TBackend, TMapped>(
  keyPrefix: string,
  path: string | null,
  params: Params | undefined,
  mapper: (item: TBackend) => TMapped,
  fallbackError: string,
): ResourceState<TMapped, TBackend> {
  const normalizedParams = normalizeParams(params);
  const key = path ? [keyPrefix, path, normalizedParams] as const : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    ([, requestPath, requestParams]) =>
      backendApi.findManyWithMeta<TBackend>(requestPath, requestParams),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  // Mapping on every render would hand every consumer a new array of new
  // objects each time, defeating the useMemo/memo guards downstream — with a
  // page of 100 documents that meant recomputing every derived value on every
  // unrelated state change.
  const items = useMemo(
    () => (data?.items ?? []).map(mapper),
    // `mapper` is a module-level function per hook, so it is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  return {
    items,
    total: data?.total ?? DEFAULT_LIST_META.total,
    offset: data?.offset ?? DEFAULT_LIST_META.offset,
    limit: data?.limit ?? DEFAULT_LIST_META.limit,
    isLoading,
    isValidating,
    error: error ? getApiErrorMessage(error, fallbackError) : "",
    refresh: mutate,
    mutate,
  };
}

export function useDatasets(params?: Params) {
  return useBackendList<TBackendDataset, TDataset>(
    "datasets",
    "/datasets/",
    params,
    mapBackendDataset,
    "Could not load datasets.",
  );
}

export function useDocuments(params?: Params) {
  return useBackendList<TBackendDocument, TIngestionDocument>(
    "documents",
    "/documents/",
    params,
    mapBackendDocument,
    "Could not load documents.",
  );
}

/**
 * One document, with its complete `processing_details` (logs included).
 *
 * List endpoints omit the ingestion trace — it is the bulk of the payload and
 * no list renders it — so detail views that need logs load the document here
 * rather than inflating every list response.
 */
export function useDocument(documentId: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    documentId ? (["document", documentId] as const) : null,
    ([, id]) => backendApi.get<TBackendDocument>(`/documents/${id}`),
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  return {
    document: data ? mapBackendDocument(data) : null,
    isLoading,
    isValidating,
    error: error ? getApiErrorMessage(error, "Could not load document.") : "",
    refresh: mutate,
  };
}

/**
 * One chunk, with `original_content` and `chunk_metadata`.
 *
 * The per-document listing omits both — together ~40% of a chunk row, and
 * neither is rendered for anything but the selected chunk.
 */
export function useChunk(chunkId: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    chunkId ? (["chunk", chunkId] as const) : null,
    ([, id]) => backendApi.get<TBackendChunk>(`/chunks/${id}`),
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  return {
    chunk: data ? mapBackendChunk(data) : null,
    isLoading,
    isValidating,
    error: error ? getApiErrorMessage(error, "Could not load chunk.") : "",
    refresh: mutate,
  };
}

/**
 * Corpus-wide counters, computed in SQL.
 *
 * Replaces summing a page of documents in the browser: the numbers are exact
 * instead of capped at whatever `limit` the caller used, and the dashboard no
 * longer fetches 100 documents to render six rows.
 */
export function useDocumentStats() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["document-stats"] as const,
    () => backendApi.get<TBackendDocumentStats>("/documents/stats"),
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  return {
    stats: data ?? null,
    isLoading,
    isValidating,
    error: error ? getApiErrorMessage(error, "Could not load statistics.") : "",
    refresh: mutate,
  };
}

export function useDocumentChunks(documentId: string | null, params?: Params) {
  return useBackendList<TBackendChunk, TIngestionChunk>(
    "document-chunks",
    documentId ? `/chunks/document/${documentId}` : null,
    params,
    mapBackendChunk,
    "Could not load chunks.",
  );
}
