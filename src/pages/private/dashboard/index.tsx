import { useMemo } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { ModeBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { useDatasets, useDocuments } from "@/core/api/hooks";
import { formatFileSize, type TDataset } from "@/core/datasets";
import {
  getDocumentChunkCount,
  getDocumentDatasetId,
  getDocumentMode,
  getDocumentStatusValue,
  getDocumentUploadedAtLabel,
} from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Box,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";

const DASHBOARD_DOCUMENT_PARAMS: Record<string, string> = {
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

const DASHBOARD_DATASET_PARAMS: Record<string, string> = {
  include_documents: "true",
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function isAwaitingApproval(document: TIngestionDocument): boolean {
  return document.processingStatus.endsWith("_awaiting_approval");
}

function isRunning(document: TIngestionDocument): boolean {
  return ![
    "completed",
    "failed",
    "cancelled",
  ].includes(document.processingStatus) && !isAwaitingApproval(document);
}

function countCompleted(documents: TIngestionDocument[]): number {
  return documents.filter((document) => document.processingStatus === "completed").length;
}

function getDatasetName(document: TIngestionDocument, datasetsById: Map<string, string>): string {
  const datasetId = getDocumentDatasetId(document);
  return (datasetId && datasetsById.get(datasetId)) || datasetId || "Unassigned dataset";
}

function getDatasetDocumentCount(dataset: TDataset): number {
  return dataset.documentCount || dataset.documents.length;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const datasetResource = useDatasets(DASHBOARD_DATASET_PARAMS);
  const documentResource = useDocuments(DASHBOARD_DOCUMENT_PARAMS);

  const datasets = datasetResource.items;
  const documents = documentResource.items;
  const isLoading = datasetResource.isLoading || documentResource.isLoading;
  const isRefreshing = datasetResource.isValidating || documentResource.isValidating;

  const datasetsById = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset.name])),
    [datasets],
  );

  const metrics = useMemo(() => {
    const totalFileBytes = documents.reduce(
      (sum, document) => sum + document.fileSize,
      0,
    );
    const chunkCount = documents.reduce(
      (sum, document) => sum + getDocumentChunkCount(document),
      0,
    );
    const completedCount = countCompleted(documents);
    const failedCount = documents.filter(
      (document) => document.processingStatus === "failed",
    ).length;
    const awaitingApprovalCount = documents.filter(isAwaitingApproval).length;
    const runningCount = documents.filter(isRunning).length;

    return {
      totalDatasets: datasetResource.total || datasets.length,
      totalDocuments: documentResource.total || documents.length,
      totalFileBytes,
      chunkCount,
      completedCount,
      failedCount,
      awaitingApprovalCount,
      runningCount,
    };
  }, [
    datasetResource.total,
    datasets.length,
    documentResource.total,
    documents,
  ]);

  const recentDocuments = documents.slice(0, 6);
  const topDatasets = useMemo(
    () =>
      [...datasets]
        .sort((left, right) => {
          const documentDelta = getDatasetDocumentCount(right) - getDatasetDocumentCount(left);
          if (documentDelta !== 0) return documentDelta;
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        })
        .slice(0, 4),
    [datasets],
  );

  const statCards = [
    {
      label: "Total Datasets",
      value: formatNumber(metrics.totalDatasets),
      delta: `${formatNumber(topDatasets.length)} active in this view`,
      icon: Database,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-t-indigo-400",
    },
    {
      label: "Total Documents",
      value: formatNumber(metrics.totalDocuments),
      delta: `${formatNumber(metrics.completedCount)} completed`,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-t-blue-400",
    },
    {
      label: "Known Chunks",
      value: formatNumber(metrics.chunkCount),
      delta: "Calculated from ingestion metrics",
      icon: Layers,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-t-violet-400",
    },
    {
      label: "Uploaded Data",
      value: formatFileSize(metrics.totalFileBytes),
      delta: `${formatNumber(documents.length)} latest files sampled`,
      icon: Cpu,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-t-emerald-400",
    },
  ];

  const quickStats = [
    {
      label: "Ready for Retrieval",
      value: metrics.completedCount,
      icon: CheckCircle2,
      status: "positive",
      sub: "Indexed and available",
    },
    {
      label: "Pending Guided Approvals",
      value: metrics.awaitingApprovalCount,
      icon: Clock,
      status: "warning",
      sub: "Waiting for review",
    },
    {
      label: "Failed Jobs",
      value: metrics.failedCount,
      icon: AlertTriangle,
      status: "danger",
      sub: "Needs attention",
    },
    {
      label: "Running Jobs",
      value: metrics.runningCount,
      icon: TrendingUp,
      status: "positive",
      sub: "Active pipeline work",
    },
  ];

  const systemStatus = [
    {
      label: "API Gateway",
      value: datasetResource.error || documentResource.error ? "Degraded" : "Online",
      icon: Activity,
      type: datasetResource.error || documentResource.error ? "danger" : "healthy",
    },
    {
      label: "Datasets API",
      value: datasetResource.error ? "Error" : "Connected",
      icon: Database,
      type: datasetResource.error ? "danger" : "healthy",
    },
    {
      label: "Documents API",
      value: documentResource.error ? "Error" : "Connected",
      icon: FileText,
      type: documentResource.error ? "danger" : "healthy",
    },
    {
      label: "Ingestion Queue",
      value: `${metrics.runningCount} running`,
      icon: Zap,
      type: metrics.runningCount > 0 ? "running" : "info",
    },
  ];

  const refreshDashboard = () => {
    void Promise.all([datasetResource.refresh(), documentResource.refresh()]);
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/40">
      <Topbar title="Dashboard" />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-6">
          {(datasetResource.error || documentResource.error) && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 flex-shrink-0" />
              <span>{datasetResource.error || documentResource.error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={cn(
                  "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-t-2 hover:shadow-md transition-shadow cursor-default group",
                  card.border,
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.bg)}>
                    <card.icon className={cn("size-5", card.color)} />
                  </div>
                  {isLoading && (
                    <Loader2 className="size-4 text-gray-300 animate-spin" />
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
                <p className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-400 mt-1">{card.delta}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickStats.map((stat) => (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={() => navigate(stat.status === "danger" ? "/activity" : "/documents")}
                    className={cn(
                      "bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow text-left",
                      stat.status === "danger"
                        ? "border-red-100 hover:border-red-200"
                        : stat.status === "warning"
                          ? "border-amber-100 hover:border-amber-200"
                          : "border-gray-100",
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
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
                      <p className="text-xl font-bold text-gray-900 tabular-nums">
                        {formatNumber(stat.value)}
                      </p>
                      <p className="text-xs font-medium text-gray-600 truncate">{stat.label}</p>
                      <p className="text-xs text-gray-400">{stat.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Recent Ingestions</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Latest documents from the backend</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/activity")}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    View all <ArrowRight className="size-3" />
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/60 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/documents/${document.id}`)}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          document.processingStatus === "completed"
                            ? "bg-emerald-50"
                            : document.processingStatus === "failed"
                              ? "bg-red-50"
                              : "bg-blue-50",
                        )}
                      >
                        <FileText
                          className={cn(
                            "size-3.5",
                            document.processingStatus === "completed"
                              ? "text-emerald-600"
                              : document.processingStatus === "failed"
                                ? "text-red-600"
                                : "text-blue-600",
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                          {document.filename}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {getDatasetName(document, datasetsById)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ModeBadge mode={getDocumentMode(document)} />
                        <StatusBadge status={getDocumentStatusValue(document.processingStatus)} />
                        <span className="text-xs text-gray-400 w-32 text-right hidden md:block">
                          {getDocumentUploadedAtLabel(document)}
                        </span>
                      </div>
                      <ArrowUpRight className="size-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}

                  {!isLoading && recentDocuments.length === 0 && (
                    <div className="px-5 py-12 text-center">
                      <FileText className="size-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-500">No ingestion activity yet</p>
                      <Button size="sm" className="mt-4 gap-2" onClick={() => navigate("/ingestions/new")}>
                        <Upload className="size-3.5" />
                        Upload File
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">System Status</h3>
                  <button
                    type="button"
                    onClick={refreshDashboard}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Refresh dashboard data"
                  >
                    <RefreshCw className={cn("size-3.5 text-gray-400", isRefreshing && "animate-spin")} />
                  </button>
                </div>
                <div className="space-y-3">
                  {systemStatus.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="size-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600">{item.label}</span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                          item.type === "healthy"
                            ? "text-emerald-700 bg-emerald-50"
                            : item.type === "running"
                              ? "text-blue-700 bg-blue-50"
                              : item.type === "danger"
                                ? "text-red-700 bg-red-50"
                                : "text-gray-600 bg-gray-100",
                        )}
                      >
                        {(item.type === "healthy" || item.type === "running") && (
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full animate-pulse",
                              item.type === "healthy" ? "bg-emerald-500" : "bg-blue-500",
                            )}
                          />
                        )}
                        {item.value}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Latest File Volume</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {formatFileSize(metrics.totalFileBytes)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Based on the latest {formatNumber(documents.length)} documents returned by the API.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Top Datasets</h3>
                  <button
                    type="button"
                    onClick={() => navigate("/datasets")}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    All <ArrowRight className="size-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {topDatasets.map((dataset, index) => (
                    <div
                      key={dataset.id}
                      className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => navigate(`/datasets/${dataset.id}`)}
                    >
                      <span className="text-xs font-bold text-gray-300 w-4 tabular-nums">
                        {index + 1}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Database className="size-3.5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                          {dataset.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatNumber(getDatasetDocumentCount(dataset))} docs
                        </p>
                      </div>
                      <StatusBadge status={dataset.status} />
                    </div>
                  ))}

                  {!isLoading && topDatasets.length === 0 && (
                    <div className="py-8 text-center">
                      <Database className="size-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-500">No datasets found</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 rounded-2xl p-5 text-white">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                    <Box className="size-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Start a new ingestion</h3>
                  <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                    Upload a supported document and track auto or guided processing from the status page.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full gap-2 bg-white text-indigo-700 hover:bg-indigo-50"
                    onClick={() => navigate("/ingestions/new")}
                  >
                    <Upload className="size-3.5" />
                    Upload File
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
