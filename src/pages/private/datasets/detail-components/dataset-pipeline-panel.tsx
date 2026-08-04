import { Activity, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type DatasetDocumentFilter,
  DOCUMENT_GROUP_CONFIG,
  DOCUMENT_GROUP_ORDER,
} from "./dataset-detail-types";
import {
  type DatasetDocumentStats,
  getPipelineSegments,
} from "./dataset-detail-utils";

export function DatasetPipelinePanel({
  stats,
  filter,
  isLive,
  onFilterChange,
}: {
  stats: DatasetDocumentStats;
  filter: DatasetDocumentFilter;
  isLive: boolean;
  onFilterChange: (filter: DatasetDocumentFilter) => void;
}) {
  const segments = getPipelineSegments(stats);
  const needsAttention = stats.failed + stats.awaiting;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">
            Ingestion pipeline
          </h2>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-blue-600" />
              </span>
              Live
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold leading-none text-gray-900 tabular-nums">
            {stats.completionRate}%
          </span>
          <span className="text-xs text-gray-400">
            indexed ({stats.completed.toLocaleString()} of{" "}
            {stats.total.toLocaleString()})
          </span>
        </div>
      </div>

      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        {segments.map((segment) => (
          <div
            key={segment.group}
            className={cn(
              "h-full transition-all duration-500",
              DOCUMENT_GROUP_CONFIG[segment.group].bar,
            )}
            style={{ width: `${segment.percentage}%` }}
            title={`${DOCUMENT_GROUP_CONFIG[segment.group].label}: ${segment.count}`}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FilterChip
          label="All documents"
          count={stats.total}
          isActive={filter === "all"}
          onClick={() => onFilterChange("all")}
          activeClassName="bg-gray-900 text-white border-gray-900"
          className="bg-gray-50 text-gray-600 border-gray-200"
        />

        {DOCUMENT_GROUP_ORDER.map((group) => {
          const config = DOCUMENT_GROUP_CONFIG[group];
          const count = stats[group];

          if (count === 0 && filter !== group) {
            return null;
          }

          return (
            <FilterChip
              key={group}
              label={config.label}
              count={count}
              dot={config.dot}
              isActive={filter === group}
              onClick={() => onFilterChange(filter === group ? "all" : group)}
              activeClassName={config.activeChip}
              className={config.chip}
            />
          );
        })}

        {stats.total > 0 && needsAttention === 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="size-3.5" />
            Nothing needs attention
          </span>
        )}
      </div>
    </section>
  );
}

function FilterChip({
  label,
  count,
  dot,
  isActive,
  onClick,
  className,
  activeClassName,
}: {
  label: string;
  count: number;
  dot?: string;
  isActive: boolean;
  onClick: () => void;
  className: string;
  activeClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all",
        isActive ? activeClassName : cn(className, "hover:brightness-95"),
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            isActive ? "bg-white/80" : dot,
          )}
        />
      )}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
          isActive ? "bg-white/25 text-white" : "bg-white/70 text-current",
        )}
      >
        {count.toLocaleString()}
      </span>
    </button>
  );
}
