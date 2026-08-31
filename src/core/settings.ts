import { AxiosError } from "axios";
import { backendApi } from "@/core/api";

/**
 * Runtime provider configuration.
 *
 * `values` carries the *effective* configuration — environment defaults with
 * saved overrides applied — and `sources` says which of the two each field
 * came from. Secrets arrive masked; the real value never leaves the backend.
 */
export type TProviderSettings = {
  revision: number;
  updated_at: string | null;
  updated_by: string | null;
  /** False when the service has no encryption key: secrets cannot be saved. */
  encryption_available: boolean;
  editable_fields: string[];
  secret_fields: string[];
  values: Record<string, string | number | boolean>;
  sources: Record<string, "env" | "settings">;
  /** Where each embedding provider's vectors are written. */
  collections: Record<string, string>;
};

export type TProviderSettingsUpdateResponse = TProviderSettings & {
  /** Providers whose vectors will now land in a new collection. */
  reindex_required: string[];
};

export type TProviderTestResult = {
  target: "ollama" | "vllm_chat" | "qwen_embedding" | "openai";
  online: boolean;
  detail: string;
  served_models: string[];
  /** Null when the endpoint did not answer, so nothing could be checked. */
  model_available: boolean | null;
};

const PROVIDERS_PATH = "/settings/providers";

/**
 * Thrown when a save would move an embedding provider to a new collection.
 * The caller confirms, then retries with `acknowledgeReindex`.
 */
export class ReindexConfirmationRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReindexConfirmationRequired";
  }
}

export async function fetchProviderSettings(): Promise<TProviderSettings> {
  return backendApi.get<TProviderSettings>(PROVIDERS_PATH);
}

export async function saveProviderSettings(
  values: Record<string, string | number | boolean>,
  { acknowledgeReindex = false }: { acknowledgeReindex?: boolean } = {},
): Promise<TProviderSettingsUpdateResponse> {
  try {
    return await backendApi.put<
      TProviderSettingsUpdateResponse,
      { values: typeof values; acknowledge_reindex: boolean }
    >(PROVIDERS_PATH, { values, acknowledge_reindex: acknowledgeReindex });
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 409) {
      throw new ReindexConfirmationRequired(
        String(error.response.data?.detail ?? "Re-ingestion confirmation required."),
      );
    }
    throw error;
  }
}

export async function testProviderSettings(
  values: Record<string, string | number | boolean>,
): Promise<TProviderTestResult[]> {
  const response = await backendApi.create<
    { results: TProviderTestResult[] },
    { values: typeof values }
  >(`${PROVIDERS_PATH}/test`, { values });
  return response.results;
}

/** Human-readable reason a save was rejected, for any error shape. */
export function describeSettingsError(error: unknown): string {
  if (error instanceof ReindexConfirmationRequired) return error.message;
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.response?.status === 412) {
      return "The service has no encryption key configured, so API keys cannot be saved here.";
    }
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
