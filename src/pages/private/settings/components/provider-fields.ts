import { Cloud, Cpu, Server, type LucideIcon } from "lucide-react";
import type { TProviderTestResult } from "@/core/settings";

export type ProviderFieldKind = "text" | "secret" | "number" | "boolean";

export type ProviderField = {
  name: string;
  label: string;
  description: string;
  kind: ProviderFieldKind;
  placeholder?: string;
};

export type ProviderGroup = {
  id: "openai" | "ollama" | "vllm";
  label: string;
  description: string;
  icon: LucideIcon;
  /** Which probe reports this group's liveness; OpenAI is key-only. */
  probeTarget: TProviderTestResult["target"];
  /** Embedding provider id whose collection this group owns, if any. */
  embeddingProvider?: string;
  fields: ProviderField[];
};

/**
 * The editable surface, grouped the way an operator thinks about it. Field
 * names match the backend's `editable_fields` exactly — anything not listed
 * there is rejected on save.
 */
export const PROVIDER_GROUPS: ProviderGroup[] = [
  {
    id: "openai",
    label: "OpenAI",
    description: "Cloud embeddings and summarization.",
    icon: Cloud,
    probeTarget: "openai",
    embeddingProvider: "openai",
    fields: [
      {
        name: "openai_api_key",
        label: "API key",
        description: "Used for both embeddings and cloud summarization.",
        kind: "secret",
        placeholder: "sk-…",
      },
      {
        name: "embedding_model",
        label: "Embedding model",
        description: "Changing this starts a new vector collection.",
        kind: "text",
      },
      {
        name: "embedding_dimensions",
        label: "Embedding dimensions",
        description: "Stored vector width. Changing it starts a new collection.",
        kind: "number",
      },
      {
        name: "openai_summary_model",
        label: "Summary model",
        description: "Vision model offered for cloud summarization.",
        kind: "text",
      },
    ],
  },
  {
    id: "ollama",
    label: "Ollama",
    description: "Local models for chat, summarization and embeddings.",
    icon: Cpu,
    probeTarget: "ollama",
    embeddingProvider: "ollama",
    fields: [
      {
        name: "ollama_base_url",
        label: "Base URL",
        description: "Reachable by both the API and the Celery workers.",
        kind: "text",
        placeholder: "http://localhost:11434",
      },
      {
        name: "chat_model",
        label: "Chat model",
        description: "Default for chat, graph extraction and summarization.",
        kind: "text",
      },
      {
        name: "ollama_embedding_model",
        label: "Embedding model",
        description: "Must be pulled into Ollama before ingestion runs.",
        kind: "text",
      },
      {
        name: "ollama_embedding_dimensions",
        label: "Embedding dimensions",
        description: "Must match the model's native width.",
        kind: "number",
      },
      {
        name: "ollama_num_ctx",
        label: "Context window",
        description: "Tokens of context requested per request.",
        kind: "number",
      },
      {
        name: "ollama_num_predict",
        label: "Max output tokens",
        description: "Upper bound on generated tokens per request.",
        kind: "number",
      },
      {
        name: "ollama_keep_alive",
        label: "Keep alive",
        description: "How long a model stays resident after use.",
        kind: "text",
        placeholder: "30m",
      },
      {
        name: "ollama_request_timeout_seconds",
        label: "Request timeout",
        description: "Seconds before one generation request is abandoned.",
        kind: "number",
      },
    ],
  },
  {
    id: "vllm",
    label: "vLLM",
    description: "Self-hosted OpenAI-compatible endpoints.",
    icon: Server,
    probeTarget: "vllm_chat",
    embeddingProvider: "qwen",
    fields: [
      {
        name: "vllm_chat_base_url",
        label: "Chat base URL",
        description: "OpenAI-compatible endpoint used for summarization.",
        kind: "text",
        placeholder: "http://localhost:8003/v1",
      },
      {
        name: "vllm_chat_api_key",
        label: "Chat API key",
        description: "vLLM accepts any non-empty value by default.",
        kind: "secret",
      },
      {
        name: "vllm_chat_model",
        label: "Chat model",
        description: "The only model accepted when vLLM summarization is picked.",
        kind: "text",
      },
      {
        name: "vllm_chat_temperature_supported",
        label: "Send temperature",
        description: "Turn off for builds that reject the temperature field.",
        kind: "boolean",
      },
      {
        name: "qwen_embedding_base_url",
        label: "Embedding base URL",
        description: "OpenAI-compatible embeddings endpoint.",
        kind: "text",
        placeholder: "http://localhost:8002/v1",
      },
      {
        name: "qwen_embedding_api_key",
        label: "Embedding API key",
        description: "Sent to the local embedding endpoint.",
        kind: "secret",
      },
      {
        name: "qwen_embedding_model",
        label: "Embedding model",
        description: "Changing this starts a new vector collection.",
        kind: "text",
      },
      {
        name: "qwen_embedding_dimensions",
        label: "Embedding dimensions",
        description: "Stored width after truncation and normalization.",
        kind: "number",
      },
    ],
  },
];

/** Fields whose change moves vectors to a different collection. */
export const REINDEXING_FIELDS = new Set([
  "embedding_model",
  "embedding_dimensions",
  "ollama_embedding_model",
  "ollama_embedding_dimensions",
  "qwen_embedding_model",
  "qwen_embedding_dimensions",
]);
