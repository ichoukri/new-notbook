import type { TBackendDataset } from "@/core/datasets";
import type { UpdateDatasetPayload } from "./dataset-detail-types";

export interface DatasetUpdateApi {
  patch<TResponse, TInput>(path: string, data: TInput): Promise<TResponse>;
}

/**
 * Persist one editor submission through Fusion's row-locked transaction.
 * Specialized narrow endpoints remain available to other callers, but the UI
 * must not split one user action across independently committed requests.
 */
export async function persistDatasetUpdate(
  api: DatasetUpdateApi,
  datasetId: string,
  payload: UpdateDatasetPayload,
): Promise<TBackendDataset> {
  return api.patch<TBackendDataset, UpdateDatasetPayload>(
    `/datasets/${datasetId}/editor`,
    payload,
  );
}
