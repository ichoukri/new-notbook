import { Cloud, Cpu, Server, type LucideIcon } from "lucide-react";
import type {
  TBackendEmbeddingProviderOption,
  TBackendLocalChatModelsResponse,
} from "@/core/ingestions";
import type {
  EmbeddingProvider,
  OllamaSummaryModel,
  SummaryModel,
  SummaryProvider,
} from "./types";

/**
 * Presentation for the three providers the ingestion pipeline can run on.
 *
 * The vLLM-served embedding provider is sent to the backend as `qwen` — the id
 * already stored on every ingested document — and shown as "vLLM" here.
 */
export const EMBEDDING_PROVIDER_ORDER: EmbeddingProvider[] = [
  "openai",
  "ollama",
  "qwen",
];

export const SUMMARY_PROVIDER_ORDER: SummaryProvider[] = [
  "ollama",
  "openai",
  "vllm",
];

type ProviderChrome = {
  label: string;
  badge: string;
  icon: LucideIcon;
};

export const EMBEDDING_PROVIDER_CHROME: Record<
  EmbeddingProvider,
  ProviderChrome
> = {
  openai: { label: "OpenAI", badge: "Cloud", icon: Cloud },
  ollama: { label: "Ollama", badge: "Local", icon: Cpu },
  qwen: { label: "vLLM", badge: "Local", icon: Server },
};

export const SUMMARY_PROVIDER_CHROME: Record<SummaryProvider, ProviderChrome> = {
  ollama: { label: "Ollama", badge: "Local", icon: Cpu },
  openai: { label: "OpenAI", badge: "Cloud", icon: Cloud },
  vllm: { label: "vLLM", badge: "Local", icon: Server },
};

/**
 * Shown until `/ai/chat-models` answers — and if it never does, so the panel
 * still describes what each provider will do. Live values always win.
 */
export const EMBEDDING_PROVIDER_FALLBACK: Record<
  EmbeddingProvider,
  Pick<
    TBackendEmbeddingProviderOption,
    "model" | "dimensions" | "infrastructure"
  >
> = {
  openai: {
    model: "text-embedding-3-large",
    dimensions: 1536,
    infrastructure: "OpenAI cloud",
  },
  ollama: {
    model: "nomic-embed-text",
    dimensions: 768,
    infrastructure: "Local Ollama",
  },
  qwen: {
    model: "Qwen3-VL-Embedding-8B",
    dimensions: 1536,
    infrastructure: "Local vLLM",
  },
};

export const EMBEDDING_PROVIDER_NOTES: Record<EmbeddingProvider, string> = {
  openai:
    "Uses the OpenAI credentials configured on the ingestion service. Chunk text is sent to OpenAI.",
  ollama:
    "The embedding model must be pulled into your Ollama service before ingestion starts.",
  qwen: "The local vLLM embedding service must be running before ingestion starts.",
};

export const OLLAMA_SUMMARY_MODELS: Array<{
  model: OllamaSummaryModel;
  label: string;
  size: string;
  vision: boolean;
  quality: string;
}> = [
  {
    model: "qwen3-vl:30b-a3b-instruct-q8_0",
    label: "Qwen3 VL 30B",
    size: "33 GB",
    vision: true,
    quality: "Recommended",
  },
  {
    model: "qwen3.6:35b-a3b-mtp-q4_K_M",
    label: "Qwen3.6 35B Q4",
    size: "22 GB",
    vision: false,
    quality: "Lower memory",
  },
  {
    model: "qwen3.6:35b-a3b-mtp-q8_0",
    label: "Qwen3.6 35B Q8",
    size: "38 GB",
    vision: false,
    quality: "Best text quality",
  },
];

const OLLAMA_SUMMARY_LABELS = new Map(
  OLLAMA_SUMMARY_MODELS.map((profile) => [
    profile.model as string,
    profile.label,
  ]),
);

/** Trim a HuggingFace-style repo id down to the model name for display. */
export function shortModelName(model: string): string {
  const [, name] = model.split("/");
  return name ?? model;
}

export function summaryModelLabel(model: SummaryModel): string {
  if (model === "gpt-4.1-mini") return "GPT-4.1 mini";
  return OLLAMA_SUMMARY_LABELS.get(model) ?? shortModelName(model);
}

/** Live embedding provider details, falling back to the static description. */
export function embeddingDetails(
  provider: EmbeddingProvider,
  localChatModels: TBackendLocalChatModelsResponse | null,
): Pick<
  TBackendEmbeddingProviderOption,
  "model" | "dimensions" | "infrastructure"
> & { configured: boolean; online: boolean } {
  const live = localChatModels?.embedding_providers?.find(
    (option) => option.provider === provider,
  );
  return {
    ...EMBEDDING_PROVIDER_FALLBACK[provider],
    ...(live && {
      model: live.model,
      dimensions: live.dimensions,
      infrastructure: live.infrastructure,
    }),
    // Nothing is known to be missing until the backend says so.
    configured: live?.configured ?? true,
    online: live?.online ?? true,
  };
}

/**
 * The model a provider should switch to when it is selected. vLLM serves a
 * single configured model, so its name comes from the backend.
 */
export function defaultSummaryModel(
  provider: SummaryProvider,
  localChatModels: TBackendLocalChatModelsResponse | null,
): SummaryModel {
  if (provider === "openai") return "gpt-4.1-mini";
  if (provider === "vllm") {
    return localChatModels?.vllm_summary_model ?? "";
  }
  return (
    localChatModels?.default_model ?? OLLAMA_SUMMARY_MODELS[0].model
  );
}
