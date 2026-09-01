import { AxiosError } from "axios";
import { backendApi } from "@/core/api";

/**
 * Runtime project configuration.
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
  /** Raw service-environment baseline; secrets remain masked. */
  environment_values: Record<string, string | number | boolean>;
  sources: Record<string, "env" | "settings">;
  /** Where each embedding provider's vectors are written. */
  collections: Record<string, string>;
  /** Safe infrastructure facts that are controlled by the service environment. */
  managed_values: Record<string, string | number | boolean>;
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
  configured_models: string[];
  missing_models: string[];
  /** Null when the endpoint did not answer, so nothing could be checked. */
  model_available: boolean | null;
};

const SETTINGS_PATH = "/settings/runtime";
const PROVIDER_TEST_PATH = "/settings/providers/test";

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

export class SettingsRevisionConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsRevisionConflict";
  }
}

export async function fetchProviderSettings(): Promise<TProviderSettings> {
  return backendApi.get<TProviderSettings>(SETTINGS_PATH);
}

export async function saveProviderSettings(
  values: Record<string, string | number | boolean>,
  {
    acknowledgeReindex = false,
    expectedRevision,
  }: { acknowledgeReindex?: boolean; expectedRevision: number },
): Promise<TProviderSettingsUpdateResponse> {
  try {
    return await backendApi.put<
      TProviderSettingsUpdateResponse,
      {
        values: typeof values;
        acknowledge_reindex: boolean;
        expected_revision: number;
      }
    >(SETTINGS_PATH, {
      values,
      acknowledge_reindex: acknowledgeReindex,
      expected_revision: expectedRevision,
    });
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 409) {
      const detail = error.response.data?.detail;
      if (
        typeof detail === "object" &&
        detail !== null &&
        "code" in detail &&
        detail.code === "settings_revision_conflict"
      ) {
        throw new SettingsRevisionConflict(
          String(
            "message" in detail
              ? detail.message
              : "Project settings changed in another session.",
          ),
        );
      }
      throw new ReindexConfirmationRequired(
        String(detail ?? "Re-ingestion confirmation required."),
      );
    }
    throw error;
  }
}

export async function testProviderSettings(
  values: Record<string, string | number | boolean>,
  targets: TProviderTestResult["target"][],
): Promise<TProviderTestResult[]> {
  const response = await backendApi.create<
    { results: TProviderTestResult[] },
    { values: typeof values; targets: typeof targets }
  >(PROVIDER_TEST_PATH, { values, targets });
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
