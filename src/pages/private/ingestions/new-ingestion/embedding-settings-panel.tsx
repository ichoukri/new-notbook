import { Check, Cloud, Cpu, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmbeddingProvider } from "./types";

const PROVIDERS = {
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

/**
 * Only Embedding is configurable here today. The rest are listed so the panel
 * shows the full shape of the pipeline, but they are rendered disabled rather
 * than as live-looking tabs that swallow the click.
 */
const SETTINGS_TABS = [
  { label: "Embedding", available: true },
  { label: "Chunking", available: false },
  { label: "Vector DB", available: false },
  { label: "Ingestion", available: false },
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
  disabled = false,
}: {
  value: EmbeddingProvider;
  onChange: (provider: EmbeddingProvider) => void;
  disabled?: boolean;
}) {
  const selected = PROVIDERS[value];

  return (
    <section aria-labelledby="ingestion-settings-title" className="lg:sticky lg:top-20">
      <h2
        id="ingestion-settings-title"
        className="text-sm font-semibold text-gray-900"
      >
        Settings
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Applies to every file in this upload.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50/70 p-1">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              disabled={!tab.available}
              aria-current={tab.available ? "page" : undefined}
              title={tab.available ? undefined : "Not configurable yet"}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                tab.available
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                  : "cursor-not-allowed text-gray-400",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-4 py-4">
          <p className="text-xs font-medium text-gray-700">Embedding provider</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Service used to generate vectors.
          </p>

          <div
            className="mt-2.5 grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="Embedding provider"
          >
            {(Object.keys(PROVIDERS) as EmbeddingProvider[]).map((provider) => {
              const details = PROVIDERS[provider];
              const Icon = details.icon;
              const isSelected = provider === value;

              return (
                <button
                  key={provider}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => onChange(provider)}
                  disabled={disabled}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1",
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
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
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      {details.badge}
                    </span>
                  </span>
                  {isSelected && (
                    <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-indigo-600 text-white ring-2 ring-white">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-1">
            <SettingRow
              label="Model"
              description="Used for document vectors"
              value={selected.model}
            />
            <SettingRow
              label="Dimensions"
              description="Stored vector width"
              value={selected.dimensions}
            />
            <SettingRow
              label="Infrastructure"
              description="Where vectors are generated"
              value={selected.infrastructure}
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
          <p>{selected.note}</p>
        </div>
      </div>
    </section>
  );
}
