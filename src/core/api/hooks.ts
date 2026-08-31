import { useMemo } from "react";
import useSWR from "swr";
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
  type TIngestionChunk,
  type TIngestionDocument,
} from "@/core/ingestions";

type Params = Record<string, string>;

type ResourceState<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  isLoading: boolean;
  isValidating: boolean;
  error: string;
  refresh: () => Promise<TPaginatedResponse<unknown> | undefined>;
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
): ResourceState<TMapped> {
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

export function useDocumentChunks(documentId: string | null, params?: Params) {
  return useBackendList<TBackendChunk, TIngestionChunk>(
    "document-chunks",
    documentId ? `/chunks/document/${documentId}` : null,
    params,
    mapBackendChunk,
    "Could not load chunks.",
  );
}
