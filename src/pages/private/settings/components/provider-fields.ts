import { Cloud, Cpu, Server, type LucideIcon } from "lucide-react";
import type { TProviderTestResult } from "@/core/settings";

export type ProviderFieldKind = "text" | "secret" | "number" | "boolean";

export type FieldSection = "connection" | "models" | "tuning";

export const SECTION_LABELS: Record<FieldSection, string> = {
  connection: "Connection",
  models: "Models",
  tuning: "Tuning",
};

export type ProviderField = {
  name: string;
  label: string;
  description: string;
  kind: ProviderFieldKind;
  section: FieldSection;
  placeholder?: string;
  /** Rendered inline after the input, e.g. a unit. */
  suffix?: string;
};

export type ProviderId = "openai" | "ollama" | "vllm";

export type ProviderGroup = {
  id: ProviderId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Every endpoint that must be healthy for this provider group. */
  probeTargets: TProviderTestResult["target"][];
  /** Embedding provider id whose collection this group owns, if any. */
  embeddingProvider?: string;
  /** Setting that turns the whole provider on or off. */
  enabledField: string;
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
    probeTargets: ["openai"],
    embeddingProvider: "openai",
    enabledField: "openai_enabled",
    fields: [
      {
        name: "openai_api_key",
        label: "API key",
        description: "Used for both embeddings and cloud summarization.",
        kind: "secret",
        section: "connection",
        placeholder: "sk-…",
      },
      {
        name: "embedding_model",
        label: "Embedding model",
        description: "Changing this starts a new vector collection.",
        kind: "text",
        section: "models",
      },
      {
        name: "embedding_dimensions",
        label: "Embedding dimensions",
        description: "Stored vector width. Changing it starts a new collection.",
        kind: "number",
        section: "models",
      },
      {
        name: "openai_summary_model",
        label: "Summary model",
        description: "Summarises table and image chunks. Vision-capable.",
        kind: "text",
        section: "models",
      },
    ],
  },
  {
    id: "ollama",
    label: "Ollama",
    description: "Local models for chat, summarization and embeddings.",
    icon: Cpu,
    probeTargets: ["ollama"],
    embeddingProvider: "ollama",
    enabledField: "ollama_enabled",
    fields: [
      {
        name: "ollama_base_url",
        label: "Base URL",
        description: "Reachable by both the API and the Celery workers.",
        kind: "text",
        section: "connection",
        placeholder: "http://localhost:11434",
      },
      {
        name: "ollama_summary_model",
        label: "Summary model",
        description:
          "Summarises table and image chunks. Should be vision-capable.",
        kind: "text",
        section: "models",
      },
      {
        name: "ollama_embedding_model",
        label: "Embedding model",
        description: "Must be pulled into Ollama before ingestion runs.",
        kind: "text",
        section: "models",
      },
      {
        name: "ollama_embedding_dimensions",
        label: "Embedding dimensions",
        description: "Must match the model's native width.",
        kind: "number",
        section: "models",
      },
      {
        name: "ollama_num_ctx",
        label: "Context window",
        description: "Tokens of context requested per request.",
        kind: "number",
        section: "tuning",
      },
      {
        name: "ollama_num_predict",
        label: "Max output tokens",
        description: "Upper bound on generated tokens per request.",
        kind: "number",
        section: "tuning",
      },
      {
        name: "ollama_keep_alive",
        label: "Keep alive",
        description: "How long a model stays resident after use.",
        kind: "text",
        section: "tuning",
        placeholder: "30m",
      },
      {
        name: "ollama_request_timeout_seconds",
        label: "Request timeout",
        description: "Seconds before one generation request is abandoned.",
        kind: "number",
        section: "tuning",
      },
    ],
  },
  {
    id: "vllm",
    label: "vLLM",
    description: "Self-hosted OpenAI-compatible endpoints.",
    icon: Server,
    probeTargets: ["vllm_chat", "qwen_embedding"],
    embeddingProvider: "qwen",
    enabledField: "vllm_enabled",
    fields: [
      {
        name: "vllm_chat_base_url",
        label: "Chat base URL",
        description: "OpenAI-compatible endpoint used for summarization.",
        kind: "text",
        section: "connection",
        placeholder: "http://localhost:8003/v1",
      },
      {
        name: "vllm_chat_api_key",
        label: "Chat API key",
        description: "vLLM accepts any non-empty value by default.",
        kind: "secret",
        section: "connection",
      },
      {
        name: "vllm_chat_model",
        label: "Chat model",
        description: "Used when vLLM is the chat provider.",
        kind: "text",
        section: "models",
      },
      {
        name: "vllm_summary_model",
        label: "Summary model",
        description: "Summarises table and image chunks. Vision-capable.",
        kind: "text",
        section: "models",
      },
      {
        name: "vllm_chat_temperature_supported",
        label: "Send temperature",
        description: "Turn off for builds that reject the temperature field.",
        kind: "boolean",
        section: "tuning",
      },
      {
        name: "qwen_embedding_base_url",
        label: "Embedding base URL",
        description: "OpenAI-compatible embeddings endpoint.",
        kind: "text",
        section: "connection",
        placeholder: "http://localhost:8002/v1",
      },
      {
        name: "qwen_embedding_api_key",
        label: "Embedding API key",
        description: "Sent to the local embedding endpoint.",
        kind: "secret",
        section: "connection",
      },
      {
        name: "qwen_embedding_model",
        label: "Embedding model",
        description: "Changing this starts a new vector collection.",
        kind: "text",
        section: "models",
      },
      {
        name: "qwen_embedding_dimensions",
        label: "Embedding dimensions",
        description: "Stored width after truncation and normalization.",
        kind: "number",
        section: "models",
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


export type TaskAssignmentField = {
  name: string;
  label: string;
  description: string;
  kind: "provider" | "text" | "number";
};

/**
 * Which provider backs the service-wide chat and answer flow.
 *
 * Embedding and summarisation stay per-ingestion choices — they are properties
 * of a corpus, not of the deployment — so they are not listed here.
 */
export const TASK_ASSIGNMENT_FIELDS: TaskAssignmentField[] = [
  {
    name: "chat_provider",
    label: "Chat provider",
    description:
      "Backs chat, query rewriting and grounded answers, using that provider's own model.",
    kind: "provider",
  },
  {
    name: "chat_model",
    label: "Chat model",
    description: "Model name as the selected chat provider knows it.",
    kind: "text",
  },
  {
    name: "chat_model_temperature",
    label: "Chat temperature",
    description: "0 keeps structured RAG answers deterministic.",
    kind: "number",
  },
];

export const PROVIDER_CHOICES: { value: ProviderId; label: string }[] = [
  { value: "ollama", label: "Ollama" },
  { value: "openai", label: "OpenAI" },
  { value: "vllm", label: "vLLM" },
];
