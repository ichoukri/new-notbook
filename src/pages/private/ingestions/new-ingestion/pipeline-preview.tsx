import { ChevronRight, CircleCheck } from "lucide-react";
import type { IngestionMode } from "./types";

const STAGES = [
  "Extract",
  "Chunk",
  "Summarize",
  "Knowledge graph",
  "Embed",
  "Publish",
];

/**
 * Shows the stages once, under both cards, rather than repeating the same list
 * inside each one. The joints carry the actual difference between the modes:
 * a plain arrow flows straight through, an approval mark stops and waits.
 */
export function PipelinePreview({ mode }: { mode: IngestionMode }) {
  const gated = mode === "guided";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Pipeline
        </p>
        <p className="text-[11px] text-gray-500">
          {STAGES.length} stages ·{" "}
          {gated ? "you approve each one" : "runs unattended"}
        </p>
      </div>

      <ol className="mt-2 flex flex-wrap items-center gap-y-1.5">
        {STAGES.map((stage, index) => (
          <li key={stage} className="flex items-center">
            {index > 0 &&
              (gated ? (
                <span
                  className="mx-1 flex items-center text-indigo-500"
                  title="Waits for your approval"
                >
                  <CircleCheck className="size-3" />
                  <span className="sr-only">then you approve, then</span>
                </span>
              ) : (
                <ChevronRight
                  className="mx-0.5 size-3 shrink-0 text-gray-300"
                  aria-hidden
                />
              ))}
            <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-gray-700 ring-1 ring-gray-200">
              {stage}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
