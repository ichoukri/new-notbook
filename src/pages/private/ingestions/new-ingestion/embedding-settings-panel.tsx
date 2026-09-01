import { useState } from "react";
import {
  Bot,
  Check,
  Eye,
  HardDrive,
  Info,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { TBackendLocalChatModelsResponse } from "@/core/ingestions";
import { cn } from "@/lib/utils";
import {
  EMBEDDING_PROVIDER_CHROME,
  EMBEDDING_PROVIDER_NOTES,
  EMBEDDING_PROVIDER_ORDER,
  OLLAMA_SUMMARY_MODELS,
  SUMMARY_PROVIDER_CHROME,
  SUMMARY_PROVIDER_ORDER,
  embeddingDetails,
  isEmbeddingProviderEnabled,
  isProviderEnabled,
  shortModelName,
} from "./providers";
import type {
  EmbeddingProvider,
  SummaryModel,
  SummaryProvider,
} from "./types";

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

/**
 * One provider in a three-up radio group. Stacked rather than side-by-side:
 * three cards share the settings column, so there is no room for an icon
 * beside the label.
 */
function ProviderCard({
  label,
  badge,
  icon: Icon,
  selected,
  disabled,
  accent,
  onSelect,
}: {
  label: string;
  badge: string;
  icon: LucideIcon;
  selected: boolean;
  disabled: boolean;
  accent: "indigo" | "violet";
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-colors",
        selected
          ? accent === "indigo"
            ? "border-indigo-500 bg-indigo-50/50"
            : "border-violet-500 bg-violet-50/50"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          selected
            ? accent === "indigo"
              ? "bg-indigo-600 text-white"
              : "bg-violet-600 text-white"
            : "bg-gray-100 text-gray-500",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-gray-900">
          {label}
        </span>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">
          {badge}
        </span>
      </span>
      {selected && (
        <Check
          className={cn(
            "absolute right-1.5 top-1.5 size-3",
            accent === "indigo" ? "text-indigo-600" : "text-violet-600",
          )}
        />
      )}
    </button>
  );
}

function StatusPill({ online, label }: { online: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold",
        online ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500",
      )}
    >
      {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
      {label}
    </span>
  );
}

/** A single non-listed model, for providers that serve exactly one. */
function SingleModelCard({
  title,
  subtitle,
  icon: Icon,
  selected,
  disabled,
  onSelect,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "mt-4 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
        selected
          ? "border-violet-500 bg-violet-50/50"
          : "border-gray-200 hover:border-gray-300",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-500",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-gray-900">
          {title}
        </span>
        <span className="mt-0.5 block text-[10px] text-gray-400">
          {subtitle}
        </span>
      </span>
      {selected && (
        <span className="flex size-4 items-center justify-center rounded-full bg-violet-600 text-white">
          <Check className="size-2.5" />
        </span>
      )}
    </button>
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

  const selectedEmbedding = embeddingDetails(value, localChatModels);
  const selectedSummary = OLLAMA_SUMMARY_MODELS.find(
    (profile) => profile.model === summaryModel,
  );
  const installedModels = new Set(
    localChatModels?.models
      .filter((profile) => profile.installed)
      .map((profile) => profile.model) ?? [],
  );

  // A provider is only blocked when the service reports it unconfigured — an
  // endpoint that is merely offline may well be up by the time Celery runs.
  const summaryUnavailable: Record<SummaryProvider, boolean> = {
    ollama: false,
    openai: localChatModels !== null && !localChatModels.openai_configured,
    vllm: localChatModels !== null && !localChatModels.vllm_configured,
  };
  const vllmSummaryModel = localChatModels?.vllm_summary_model ?? "";

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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-700">Provider</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Service used to generate search vectors.
                  </p>
                </div>
                {value !== "openai" && (
                  <StatusPill
                    online={selectedEmbedding.online}
                    label={selectedEmbedding.online ? "Online" : "Unavailable"}
                  />
                )}
              </div>

              <div
                className="mt-2.5 grid auto-cols-fr grid-flow-col gap-2"
                role="radiogroup"
                aria-label="Embedding provider"
              >
                {EMBEDDING_PROVIDER_ORDER.filter((provider) =>
                  isEmbeddingProviderEnabled(provider, localChatModels),
                ).map((provider) => {
                  const chrome = EMBEDDING_PROVIDER_CHROME[provider];
                  const details = embeddingDetails(provider, localChatModels);
                  return (
                    <ProviderCard
                      key={provider}
                      label={chrome.label}
                      badge={details.configured ? chrome.badge : "Not set up"}
                      icon={chrome.icon}
                      accent="indigo"
                      selected={provider === value}
                      disabled={disabled || !details.configured}
                      onSelect={() => onChange(provider)}
                    />
                  );
                })}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-1">
                <SettingRow
                  label="Model"
                  description="Used for document vectors"
                  value={shortModelName(selectedEmbedding.model)}
                />
                <SettingRow
                  label="Dimensions"
                  description="Stored vector width"
                  value={selectedEmbedding.dimensions.toLocaleString()}
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
                value !== "openai" && !selectedEmbedding.online
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-gray-100 bg-gray-50 text-gray-500",
              )}
            >
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <p>{EMBEDDING_PROVIDER_NOTES[value]}</p>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-700">Provider</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Service that summarizes tables and images.
                  </p>
                </div>
                {summaryProvider === "ollama" && (
                  <StatusPill
                    online={Boolean(localChatModels?.online)}
                    label={localChatModels?.online ? "Online" : "Unavailable"}
                  />
                )}
                {summaryProvider === "vllm" && (
                  <StatusPill
                    online={Boolean(localChatModels?.vllm_online)}
                    label={
                      localChatModels?.vllm_online ? "Online" : "Unavailable"
                    }
                  />
                )}
              </div>

              <div
                className="mt-2.5 grid auto-cols-fr grid-flow-col gap-2"
                role="radiogroup"
                aria-label="Summarization provider"
              >
                {SUMMARY_PROVIDER_ORDER.filter((provider) =>
                  isProviderEnabled(provider, localChatModels),
                ).map((provider) => {
                  const chrome = SUMMARY_PROVIDER_CHROME[provider];
                  const unavailable = summaryUnavailable[provider];
                  return (
                    <ProviderCard
                      key={provider}
                      label={chrome.label}
                      badge={unavailable ? "Not set up" : chrome.badge}
                      icon={chrome.icon}
                      accent="violet"
                      selected={provider === summaryProvider}
                      disabled={disabled || unavailable}
                      onSelect={() => onSummaryProviderChange(provider)}
                    />
                  );
                })}
              </div>

              {summaryProvider === "ollama" && (
                <>
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-700">
                      Local model
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Runs entirely through your Ollama service.
                    </p>
                  </div>

                  <div
                    className="mt-3 space-y-2"
                    role="radiogroup"
                    aria-label="Local summarization model"
                  >
                    {OLLAMA_SUMMARY_MODELS.map((profile) => {
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
              )}

              {summaryProvider === "openai" && (
                <SingleModelCard
                  title="GPT-4.1 mini"
                  subtitle="Vision · OpenAI cloud · Fast"
                  icon={SUMMARY_PROVIDER_CHROME.openai.icon}
                  selected={summaryModel === "gpt-4.1-mini"}
                  disabled={disabled}
                  onSelect={() => onSummaryModelChange("gpt-4.1-mini")}
                />
              )}

              {summaryProvider === "vllm" && (
                <SingleModelCard
                  title={
                    vllmSummaryModel
                      ? shortModelName(vllmSummaryModel)
                      : "Configured vLLM model"
                  }
                  subtitle={
                    localChatModels
                      ? `Served by ${localChatModels.vllm_base_url}`
                      : "Loading endpoint…"
                  }
                  icon={SUMMARY_PROVIDER_CHROME.vllm.icon}
                  selected={summaryModel === vllmSummaryModel}
                  disabled={disabled || !vllmSummaryModel}
                  onSelect={() => onSummaryModelChange(vllmSummaryModel)}
                />
              )}
            </div>

            <div
              className={cn(
                "flex items-start gap-2 border-t px-4 py-3 text-[11px] leading-relaxed",
                summaryProvider === "ollama" && selectedSummary
                  ? selectedSummary.vision
                    ? "border-gray-100 bg-gray-50 text-gray-500"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-gray-100 bg-gray-50 text-gray-500",
              )}
            >
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <p>
                {summaryProvider === "openai"
                  ? "Uses your configured OPENAI_API_KEY. Document text and visual crops are sent to OpenAI for summarization."
                  : summaryProvider === "vllm"
                    ? "Runs on your local vLLM endpoint. It must be serving the configured model before ingestion starts."
                    : selectedSummary?.vision
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
