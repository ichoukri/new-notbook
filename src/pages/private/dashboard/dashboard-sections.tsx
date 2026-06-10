import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileText,
  Layers,
  Loader2,
  TrendingUp,
  Upload,
} from "lucide-react";
import { ModeBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/core/datasets";
import {
  getDocumentDatasetName,
  getDocumentMode,
  getDocumentStatusValue,
  getDocumentUploadedAtLabel,
} from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";
import { cn } from "@/lib/utils";
import {
  type DashboardMetrics,
  formatDashboardNumber,
} from "./dashboard-utils";

type SummaryCardsProps = {
  metrics: DashboardMetrics;
  sampledDocumentCount: number;
  topDatasetCount: number;
  isLoading: boolean;
};

export function DashboardSummaryCards({
  metrics,
  sampledDocumentCount,
  topDatasetCount,
  isLoading,
}: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Datasets",
      value: formatDashboardNumber(metrics.totalDatasets),
      delta: `${formatDashboardNumber(topDatasetCount)} active in this view`,
      icon: Database,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-t-indigo-400",
    },
    {
      label: "Total Documents",
      value: formatDashboardNumber(metrics.totalDocuments),
      delta: `${formatDashboardNumber(metrics.completedCount)} completed`,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-t-blue-400",
    },
    {
      label: "Known Chunks",
      value: formatDashboardNumber(metrics.chunkCount),
      delta: "Calculated from ingestion metrics",
      icon: Layers,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-t-violet-400",
    },
    {
      label: "Uploaded Data",
      value: formatFileSize(metrics.totalFileBytes),
      delta: `${formatDashboardNumber(sampledDocumentCount)} latest files sampled`,
      icon: Cpu,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-t-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "group cursor-default rounded-2xl border border-gray-100 bg-white p-5 shadow-sm border-t-2 transition-shadow hover:shadow-md",
            card.border,
          )}
        >
          <div className="mb-4 flex items-start justify-between">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                card.bg,
              )}
            >
              <card.icon className={cn("size-5", card.color)} />
            </div>
            {isLoading && (
              <Loader2 className="size-4 animate-spin text-gray-300" />
            )}
          </div>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {card.value}
          </p>
          <p className="mt-0.5 text-sm font-medium text-gray-600">
            {card.label}
          </p>
          <p className="mt-1 text-xs text-gray-400">{card.delta}</p>
        </div>
      ))}
    </div>
  );
}

type QuickStatsProps = {
  metrics: DashboardMetrics;
  onNavigate: (path: string) => void;
};

export function DashboardQuickStats({
  metrics,
  onNavigate,
}: QuickStatsProps) {
  const stats = [
    {
      label: "Ready for Retrieval",
      value: metrics.completedCount,
      icon: CheckCircle2,
      status: "positive",
      sub: "Indexed and available",
      path: "/documents",
    },
    {
      label: "Pending Guided Approvals",
      value: metrics.awaitingApprovalCount,
      icon: Clock,
      status: "warning",
      sub: "Waiting for review",
      path: "/documents",
    },
    {
      label: "Failed Jobs",
      value: metrics.failedCount,
      icon: AlertTriangle,
      status: "danger",
      sub: "Needs attention",
      path: "/activity",
    },
    {
      label: "Running Jobs",
      value: metrics.runningCount,
      icon: TrendingUp,
      status: "positive",
      sub: "Active pipeline work",
      path: "/documents",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {stats.map((stat) => (
        <button
          key={stat.label}
          type="button"
          onClick={() => onNavigate(stat.path)}
          className={cn(
            "flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md",
            stat.status === "danger"
              ? "border-red-100 hover:border-red-200"
              : stat.status === "warning"
                ? "border-amber-100 hover:border-amber-200"
                : "border-gray-100",
          )}
        >
          <div
            className={cn(
              "flex size-10 flex-shrink-0 items-center justify-center rounded-xl",
              stat.status === "positive"
                ? "bg-emerald-50"
                : stat.status === "warning"
                  ? "bg-amber-50"
                  : "bg-red-50",
            )}
          >
            <stat.icon
              className={cn(
                "size-5",
                stat.status === "positive"
                  ? "text-emerald-600"
                  : stat.status === "warning"
                    ? "text-amber-600"
                    : "text-red-600",
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tabular-nums text-gray-900">
              {formatDashboardNumber(stat.value)}
            </p>
            <p className="truncate text-xs font-medium text-gray-600">
              {stat.label}
            </p>
            <p className="text-xs text-gray-400">{stat.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

type RecentIngestionsProps = {
  documents: TIngestionDocument[];
  datasetsById: Map<string, string>;
  isLoading: boolean;
  onOpenDocument: (documentId: string) => void;
  onViewAll: () => void;
  onUpload: () => void;
};

export function RecentIngestions({
  documents,
  datasetsById,
  isLoading,
  onOpenDocument,
  onViewAll,
  onUpload,
}: RecentIngestionsProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Recent Ingestions
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Latest documents from the backend
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700"
        >
          View all <ArrowRight className="size-3" />
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {documents.map((document) => (
          <RecentIngestionRow
            key={document.id}
            document={document}
            datasetName={getDocumentDatasetName(document, datasetsById)}
            onOpen={() => onOpenDocument(document.id)}
          />
        ))}

        {!isLoading && documents.length === 0 && (
          <div className="px-5 py-12 text-center">
            <FileText className="mx-auto mb-2 size-8 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">
              No ingestion activity yet
            </p>
            <Button size="sm" className="mt-4 gap-2" onClick={onUpload}>
              <Upload className="size-3.5" />
              Upload File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function RecentIngestionRow({
  document,
  datasetName,
  onOpen,
}: {
  document: TIngestionDocument;
  datasetName: string;
  onOpen: () => void;
}) {
  const isCompleted = document.processingStatus === "completed";
  const isFailed = document.processingStatus === "failed";

  return (
    <div
      className="group flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50/60"
      onClick={onOpen}
    >
      <div
        className={cn(
          "flex size-8 flex-shrink-0 items-center justify-center rounded-lg",
          isCompleted ? "bg-emerald-50" : isFailed ? "bg-red-50" : "bg-blue-50",
        )}
      >
        <FileText
          className={cn(
            "size-3.5",
            isCompleted
              ? "text-emerald-600"
              : isFailed
                ? "text-red-600"
                : "text-blue-600",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800 transition-colors group-hover:text-indigo-600">
          {document.filename}
        </p>
        <p className="truncate text-xs text-gray-400">{datasetName}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <ModeBadge mode={getDocumentMode(document)} />
        <StatusBadge status={getDocumentStatusValue(document.processingStatus)} />
        <span className="hidden w-32 text-right text-xs text-gray-400 md:block">
          {getDocumentUploadedAtLabel(document)}
        </span>
      </div>
      <ArrowUpRight className="size-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
