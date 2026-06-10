import {
  Activity,
  ArrowRight,
  Box,
  Database,
  FileText,
  RefreshCw,
  Upload,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { formatFileSize, type TDataset } from "@/core/datasets";
import { cn } from "@/lib/utils";
import {
  type DashboardMetrics,
  formatDashboardNumber,
  getDatasetDocumentCount,
} from "./dashboard-utils";

type SystemStatusProps = {
  metrics: DashboardMetrics;
  datasetError: string;
  documentError: string;
  sampledDocumentCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
};

type SystemStatusType = "healthy" | "running" | "danger" | "info";

type SystemStatusItem = {
  label: string;
  value: string;
  icon: LucideIcon;
  type: SystemStatusType;
};

export function SystemStatusPanel({
  metrics,
  datasetError,
  documentError,
  sampledDocumentCount,
  isRefreshing,
  onRefresh,
}: SystemStatusProps) {
  const hasError = Boolean(datasetError || documentError);
  const items: SystemStatusItem[] = [
    {
      label: "API Gateway",
      value: hasError ? "Degraded" : "Online",
      icon: Activity,
      type: hasError ? "danger" : "healthy",
    },
    {
      label: "Datasets API",
      value: datasetError ? "Error" : "Connected",
      icon: Database,
      type: datasetError ? "danger" : "healthy",
    },
    {
      label: "Documents API",
      value: documentError ? "Error" : "Connected",
      icon: FileText,
      type: documentError ? "danger" : "healthy",
    },
    {
      label: "Ingestion Queue",
      value: `${metrics.runningCount} running`,
      icon: Zap,
      type: metrics.runningCount > 0 ? "running" : "info",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">System Status</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
          title="Refresh dashboard data"
        >
          <RefreshCw
            className={cn(
              "size-3.5 text-gray-400",
              isRefreshing && "animate-spin",
            )}
          />
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <SystemStatusRow key={item.label} item={item} />
        ))}
        <div className="border-t border-gray-50 pt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-gray-500">Latest File Volume</span>
            <span className="text-xs font-semibold text-gray-700">
              {formatFileSize(metrics.totalFileBytes)}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Based on the latest {formatDashboardNumber(sampledDocumentCount)}{" "}
            documents returned by the API.
          </p>
        </div>
      </div>
    </div>
  );
}

function SystemStatusRow({ item }: { item: SystemStatusItem }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <item.icon className="size-3.5 text-gray-400" />
        <span className="text-sm text-gray-600">{item.label}</span>
      </div>
      <span
        className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          item.type === "healthy"
            ? "bg-emerald-50 text-emerald-700"
            : item.type === "running"
              ? "bg-blue-50 text-blue-700"
              : item.type === "danger"
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-600",
        )}
      >
        {(item.type === "healthy" || item.type === "running") && (
          <span
            className={cn(
              "size-1.5 animate-pulse rounded-full",
              item.type === "healthy" ? "bg-emerald-500" : "bg-blue-500",
            )}
          />
        )}
        {item.value}
      </span>
    </div>
  );
}

type TopDatasetsProps = {
  datasets: TDataset[];
  isLoading: boolean;
  onOpenDataset: (datasetId: string) => void;
  onViewAll: () => void;
};

export function TopDatasetsPanel({
  datasets,
  isLoading,
  onOpenDataset,
  onViewAll,
}: TopDatasetsProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Top Datasets</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          All <ArrowRight className="size-3" />
        </button>
      </div>
      <div className="space-y-2">
        {datasets.map((dataset, index) => (
          <div
            key={dataset.id}
            className="group flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50"
            onClick={() => onOpenDataset(dataset.id)}
          >
            <span className="w-4 text-xs font-bold tabular-nums text-gray-300">
              {index + 1}
            </span>
            <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50">
              <Database className="size-3.5 text-indigo-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800 transition-colors group-hover:text-indigo-600">
                {dataset.name}
              </p>
              <p className="text-xs text-gray-400">
                {formatDashboardNumber(getDatasetDocumentCount(dataset))} docs
              </p>
            </div>
            <StatusBadge status={dataset.status} />
          </div>
        ))}

        {!isLoading && datasets.length === 0 && (
          <div className="py-8 text-center">
            <Database className="mx-auto mb-2 size-8 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">
              No datasets found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function IngestionCta({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-5 text-white">
      <div className="relative">
        <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/15">
          <Box className="size-5" />
        </div>
        <h3 className="mb-1 text-sm font-semibold">Start a new ingestion</h3>
        <p className="mb-4 text-xs leading-relaxed text-indigo-100">
          Upload a supported document and track auto or guided processing from
          the status page.
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="w-full gap-2 bg-white text-indigo-700 hover:bg-indigo-50"
          onClick={onUpload}
        >
          <Upload className="size-3.5" />
          Upload File
        </Button>
      </div>
    </div>
  );
}
