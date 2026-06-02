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

  return {
    items: (data?.items ?? []).map(mapper),
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

export function useDocumentChunks(documentId: string | null, params?: Params) {
  return useBackendList<TBackendChunk, TIngestionChunk>(
    "document-chunks",
    documentId ? `/chunks/document/${documentId}` : null,
    params,
    mapBackendChunk,
    "Could not load chunks.",
  );
}
