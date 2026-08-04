import { useState } from "react";
import {
  Bot,
  Check,
  Cloud,
  Cpu,
  Eye,
  HardDrive,
  Info,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { TBackendLocalChatModelsResponse } from "@/core/ingestions";
import { cn } from "@/lib/utils";
import type {
  EmbeddingProvider,
  SummaryModel,
  SummaryProvider,
} from "./types";

const EMBEDDING_PROVIDERS = {
  openai: {
    label: "OpenAI",
    badge: "Cloud",
    icon: Cloud,
    model: "text-embedding-3-large",
    dimensions: "1,536",
    infrastructure: "OpenAI cloud",
    note: "Uses the OpenAI credentials configured on the ingestion service.",
  },
  qwen: {
    label: "Qwen",
    badge: "Local",
    icon: Cpu,
    model: "Qwen3-VL-Embedding-8B",
    dimensions: "1,536",
    infrastructure: "Local vLLM",
    note: "The local Qwen vLLM service must be running before ingestion starts.",
  },
} satisfies Record<EmbeddingProvider, object>;

type LocalSummaryModel = Exclude<SummaryModel, "gpt-4.1-mini">;

const SUMMARY_MODELS: Array<{
  model: LocalSummaryModel;
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

function SettingRow({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-gray-100 py-3 first:border-t-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">
          {description}
        </p>
      </div>
      <span className="max-w-[55%] shrink-0 wrap-break-word text-right text-xs font-medium tabular-nums text-gray-900">
        {value}
      </span>
    </div>
  );
}

export function EmbeddingSettingsPanel({
  value,
  onChange,
  summaryModel,
  onSummaryModelChange,
  summaryProvider,
  onSummaryProviderChange,
  localChatModels,
  disabled = false,
}: {
  value: EmbeddingProvider;
  onChange: (provider: EmbeddingProvider) => void;
  summaryModel: SummaryModel;
  onSummaryModelChange: (model: SummaryModel) => void;
  summaryProvider: SummaryProvider;
  onSummaryProviderChange: (provider: SummaryProvider) => void;
  localChatModels: TBackendLocalChatModelsResponse | null;
  disabled?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"embedding" | "summarization">(
    "embedding",
  );
  const selectedEmbedding = EMBEDDING_PROVIDERS[value];
  const selectedSummary =
    SUMMARY_MODELS.find((profile) => profile.model === summaryModel) ??
    ({ vision: true } as const);
  const installedModels = new Set(
    localChatModels?.models
      .filter((profile) => profile.installed)
      .map((profile) => profile.model) ?? [],
  );
  const openAIUnavailable =
    localChatModels !== null && !localChatModels.openai_configured;

  return (
    <section aria-labelledby="ingestion-settings-title">
      <h2 id="ingestion-settings-title" className="sr-only">
        AI model settings
      </h2>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div
          className="grid grid-cols-2 border-b border-gray-200 bg-gray-50/70 p-1.5"
          role="tablist"
          aria-label="AI model settings"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "embedding"}
            onClick={() => setActiveTab("embedding")}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
              activeTab === "embedding"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                : "text-gray-500 hover:text-gray-800",
            )}
          >
            Embedding
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "summarization"}
            onClick={() => setActiveTab("summarization")}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
              activeTab === "summarization"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                : "text-gray-500 hover:text-gray-800",
            )}
          >
            Summarization
          </button>
        </div>

        {activeTab === "embedding" ? (
          <>
            <div className="px-4 py-4">
              <p className="text-xs font-medium text-gray-700">Provider</p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Service used to generate search vectors.
              </p>

              <div
                className="mt-2.5 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Embedding provider"
              >
                {(Object.keys(EMBEDDING_PROVIDERS) as EmbeddingProvider[]).map(
                  (provider) => {
                    const details = EMBEDDING_PROVIDERS[provider];
                    const Icon = details.icon;
                    const isSelected = provider === value;

                    return (
                      <button
                        key={provider}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onChange(provider)}
                        disabled={disabled}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                          disabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md",
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-100 text-gray-500",
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-gray-900">
                            {details.label}
                          </span>
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                            {details.badge}
                          </span>
                        </span>
                        {isSelected && (
                          <Check className="absolute right-2 top-2 size-3 text-indigo-600" />
                        )}
                      </button>
                    );
                  },
                )}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-1">
                <SettingRow
                  label="Model"
                  description="Used for document vectors"
                  value={selectedEmbedding.model}
                />
                <SettingRow
                  label="Dimensions"
                  description="Stored vector width"
                  value={selectedEmbedding.dimensions}
                />
                <SettingRow
                  label="Infrastructure"
                  description="Where vectors are generated"
                  value={selectedEmbedding.infrastructure}
                />
              </div>
            </div>

            <div
              className={cn(
                "flex items-start gap-2 border-t px-4 py-3 text-[11px] leading-relaxed",
                value === "qwen"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-gray-100 bg-gray-50 text-gray-500",
              )}
            >
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <p>{selectedEmbedding.note}</p>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-4">
              <p className="text-xs font-medium text-gray-700">Provider</p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Choose local processing or OpenAI cloud.
              </p>

              <div
                className="mt-2.5 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Summarization provider"
              >
                {(
                  [
                    { provider: "ollama", label: "Ollama", badge: "Local", icon: Cpu },
                    { provider: "openai", label: "OpenAI", badge: "Cloud", icon: Cloud },
                  ] as const
                ).map((option) => {
                  const selected = option.provider === summaryProvider;
                  const Icon = option.icon;
                  const unavailable =
                    option.provider === "openai" && openAIUnavailable;
                  return (
                    <button
                      key={option.provider}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onSummaryProviderChange(option.provider)}
                      disabled={disabled || unavailable}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        selected
                          ? "border-violet-500 bg-violet-50/50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                        (disabled || unavailable) &&
                          "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md",
                          selected
                            ? "bg-violet-600 text-white"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span>
                        <span className="block text-xs font-semibold text-gray-900">
                          {option.label}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                          {unavailable ? "Key missing" : option.badge}
                        </span>
                      </span>
                      {selected && (
                        <Check className="absolute right-2 top-2 size-3 text-violet-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {summaryProvider === "ollama" ? (
                <>
                  <div className="mt-4 flex items-start justify-between gap-3 border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Local model</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Runs entirely through your Ollama service.
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold",
                        localChatModels?.online
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {localChatModels?.online ? (
                        <Wifi className="size-3" />
                      ) : (
                        <WifiOff className="size-3" />
                      )}
                      {localChatModels?.online ? "Online" : "Unavailable"}
                    </span>
                  </div>

                  <div
                    className="mt-3 space-y-2"
                    role="radiogroup"
                    aria-label="Local summarization model"
                  >
                    {SUMMARY_MODELS.map((profile) => {
                      const selected = profile.model === summaryModel;
                      const installed = installedModels.has(profile.model);

                      return (
                        <button
                          key={profile.model}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => onSummaryModelChange(profile.model)}
                          disabled={disabled}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                            selected
                              ? "border-violet-500 bg-violet-50/50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                            disabled && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              selected
                                ? "bg-violet-600 text-white"
                                : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {profile.vision ? (
                              <Eye className="size-4" />
                            ) : (
                              <Bot className="size-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-semibold text-gray-900">
                                {profile.label}
                              </span>
                              {installed && localChatModels?.online && (
                                <Check className="size-3 text-emerald-600" />
                              )}
                            </span>
                            <span className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                              <span className="inline-flex items-center gap-1">
                                <HardDrive className="size-2.5" /> {profile.size}
                              </span>
                              <span>·</span>
                              <span>{profile.quality}</span>
                              {profile.vision && <span>· Vision</span>}
                            </span>
                          </span>
                          {selected && (
                            <span className="flex size-4 items-center justify-center rounded-full bg-violet-600 text-white">
                              <Check className="size-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  role="radio"
                  aria-checked={summaryModel === "gpt-4.1-mini"}
                  onClick={() => onSummaryModelChange("gpt-4.1-mini")}
                  disabled={disabled}
                  className={cn(
                    "mt-4 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                    summaryModel === "gpt-4.1-mini"
                      ? "border-violet-500 bg-violet-50/50"
                      : "border-gray-200 hover:border-gray-300",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      summaryModel === "gpt-4.1-mini"
                        ? "bg-violet-600 text-white"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    <Cloud className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-gray-900">
                      GPT-4.1 mini
                    </span>
                    <span className="mt-0.5 block text-[10px] text-gray-400">
                      Vision · OpenAI cloud · Fast
                    </span>
                  </span>
                  {summaryModel === "gpt-4.1-mini" && (
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full",
                        "bg-violet-600 text-white",
                      )}
                    >
                      <Check className="size-2.5" />
                    </span>
                  )}
                </button>
              )}
            </div>

            <div
              className={cn(
                "flex items-start gap-2 border-t px-4 py-3 text-[11px] leading-relaxed",
                summaryProvider === "openai" || selectedSummary.vision
                  ? "border-gray-100 bg-gray-50 text-gray-500"
                  : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <p>
                {summaryProvider === "openai"
                  ? "Uses your configured OPENAI_API_KEY. Document text and visual crops are sent to OpenAI for summarization."
                  : selectedSummary.vision
                    ? "Recommended for PDFs and images. It reads visual crops, tables and extracted text."
                  : "Text-only model: visual crops are omitted, so summaries rely on OCR and extracted table text."}
              </p>
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        Chat, graph extraction and grounded answers also run locally through
        Ollama using the service default.
      </p>
    </section>
  );
}
