import { ClipboardList, Zap } from "lucide-react";
import { formatFileSize } from "@/core/datasets";
import { cn } from "@/lib/utils";
import { formatModeEstimateCompact } from "./estimates";
import type {
  EmbeddingProvider,
  IngestionMode,
  SummaryModel,
  SummaryProvider,
} from "./types";

const SUMMARY_LABELS: Record<SummaryModel, string> = {
  "gpt-4.1-mini": "GPT-4.1 mini",
  "qwen3-vl:30b-a3b-instruct-q8_0": "Qwen3 VL 30B",
  "qwen3.6:35b-a3b-mtp-q4_K_M": "Qwen3.6 35B Q4",
  "qwen3.6:35b-a3b-mtp-q8_0": "Qwen3.6 35B Q8",
};

function SummaryRow({
  label,
  value,
  muted = false,
  children,
}: {
  label: string;
  value?: string;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-gray-100 py-2.5 first:border-t-0">
      <span className="text-xs text-gray-500">{label}</span>
      {children ?? (
        <span
          className={cn(
            "min-w-0 truncate text-xs font-medium",
            muted ? "text-gray-400" : "text-gray-900",
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

/**
 * Restates the run about to start. The step checkmarks say a field is filled;
 * this says what filling them added up to, which is what the user is actually
 * confirming when they press Start.
 */
export function RunSummary({
  datasetName,
  fileCount,
  totalSize,
  mode,
  embeddingProvider,
  summaryProvider,
  summaryModel,
}: {
  datasetName: string | null;
  fileCount: number;
  totalSize: number;
  mode: IngestionMode;
  embeddingProvider: EmbeddingProvider;
  summaryProvider: SummaryProvider;
  summaryModel: SummaryModel;
}) {
  const ModeIcon = mode === "guided" ? ClipboardList : Zap;

  return (
    <section
      aria-labelledby="run-summary-title"
      className="overflow-hidden rounded-xl border border-gray-200 bg-white"
    >
      <div className="border-b border-gray-200 bg-gray-50/70 px-4 py-2.5">
        <p
          id="run-summary-title"
          className="text-[11px] font-semibold uppercase tracking-wide text-gray-500"
        >
          This run
        </p>
      </div>

      <div className="px-4 py-1">
        <SummaryRow
          label="Dataset"
          value={datasetName ?? "Not selected"}
          muted={!datasetName}
        />
        <SummaryRow
          label="Files"
          value={
            fileCount === 0
              ? "None added"
              : `${fileCount} file${fileCount === 1 ? "" : "s"} · ${formatFileSize(totalSize)}`
          }
          muted={fileCount === 0}
        />
        <SummaryRow label="Mode">
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-900">
            <ModeIcon className="size-3.5 text-indigo-500" />
            {mode === "guided" ? "Guided" : "Auto"}
          </span>
        </SummaryRow>
        <SummaryRow
          label="Embedding"
          value={embeddingProvider === "openai" ? "OpenAI" : "Qwen local"}
        />
        <SummaryRow
          label="Summarization"
          value={`${summaryProvider === "openai" ? "OpenAI" : "Local"} · ${SUMMARY_LABELS[summaryModel]}`}
        />
        <SummaryRow
          label="Estimated"
          value={
            fileCount === 0 ? "—" : formatModeEstimateCompact(mode, fileCount)
          }
          muted={fileCount === 0}
        />
      </div>
    </section>
  );
}
