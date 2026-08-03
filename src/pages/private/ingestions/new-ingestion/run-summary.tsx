import { ClipboardList, Cloud, Cpu, FileText, FolderOpen, Zap } from "lucide-react";
import { formatFileSize } from "@/core/datasets";
import type { EmbeddingProvider, IngestionMode } from "./types";
import type { IconComponent } from "./types";

/**
 * Restates the run about to start. The step checkmarks say a field is filled;
 * this says what filling them added up to, which is what the user is actually
 * confirming when they press Start.
 */
export function RunSummary({
  datasetName,
  fileCount,
  totalSize,
  provider,
  mode,
}: {
  datasetName: string | null;
  fileCount: number;
  totalSize: number;
  provider: EmbeddingProvider;
  mode: IngestionMode;
}) {
  const parts: Array<{ icon: IconComponent; label: string; muted?: boolean }> = [
    {
      icon: FolderOpen,
      label: datasetName ?? "No dataset",
      muted: !datasetName,
    },
    {
      icon: FileText,
      label:
        fileCount === 0
          ? "No files"
          : `${fileCount} file${fileCount === 1 ? "" : "s"} · ${formatFileSize(totalSize)}`,
      muted: fileCount === 0,
    },
    {
      icon: provider === "openai" ? Cloud : Cpu,
      label: provider === "openai" ? "OpenAI" : "Qwen",
    },
    {
      icon: mode === "guided" ? ClipboardList : Zap,
      label: mode === "guided" ? "Guided" : "Auto",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs lg:justify-end">
      {parts.map(({ icon: Icon, label, muted }, index) => (
        <span key={label} className="flex items-center gap-2">
          {index > 0 && (
            <span className="text-gray-300" aria-hidden>
              ·
            </span>
          )}
          <span
            className={`flex items-center gap-1.5 ${
              muted ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <Icon className="size-3.5 text-gray-400" />
            <span className="font-medium">{label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
