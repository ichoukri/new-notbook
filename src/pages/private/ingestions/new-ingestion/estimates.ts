import type { IngestionMode } from "./types";

const PER_DOCUMENT: Record<IngestionMode, string> = {
  auto: "~2 min",
  guided: "~5–10 min",
};

/**
 * Stated per document rather than as a batch total: the pipeline overlaps work
 * across files, so multiplying the per-file figure would overstate the wait.
 */
export function formatModeEstimate(mode: IngestionMode, fileCount: number) {
  const base = PER_DOCUMENT[mode];
  return fileCount > 1
    ? `${base} per document · ${fileCount} documents`
    : base;
}

/** Same figure, trimmed for a narrow label/value row. */
export function formatModeEstimateCompact(
  mode: IngestionMode,
  fileCount: number,
) {
  const base = PER_DOCUMENT[mode];
  return fileCount > 1 ? `${base} / doc` : base;
}
