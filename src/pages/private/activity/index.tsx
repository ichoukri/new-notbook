import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { ModeBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDatasets, useDocuments } from "@/core/api/hooks";
import {
  getDocumentDatasetName,
  getDocumentMode,
  getDocumentStatusValue,
  getDocumentUploadedAtLabel,
  isDocumentActivelyProcessing,
  isDocumentAwaitingReview,
} from "@/core/documents";
import {
  formatIngestionLogTime,
  getDocumentStatusLabel,
  getIngestionError,
  getIngestionLogs,
  getIngestionMetrics,
  type TIngestionDocument,
} from "@/core/ingestions";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Timer,
  TrendingUp,
  X,
} from "lucide-react";

const ACTIVITY_DOCUMENT_PARAMS: Record<string, string> = {
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

const ACTIVITY_DATASET_PARAMS: Record<string, string> = {
  include_documents: "false",
  limit: "100",
};

const STATUS_FILTERS = [
  { value: "all-status", label: "All Status" },
  { value: "queued", label: "Queued" },
  { value: "partitioning", label: "Extracting" },
  { value: "chunking", label: "Chunking" },
  { value: "summarising", label: "Summarising" },
  { value: "vectorization", label: "Embedding" },
  { value: "awaiting", label: "Awaiting Review" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function getDocumentIconStyle(document: TIngestionDocument) {
  if (document.processingStatus === "completed") {
    return { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" };
  }
  if (document.processingStatus === "failed") {
    return { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" };
  }
  if (isDocumentActivelyProcessing(document)) {
    return { icon: Loader2, color: "text-blue-600", bg: "bg-blue-50" };
  }
  return { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" };
}

function matchesStatusFilter(document: TIngestionDocument, filter: string): boolean {
  if (filter === "all-status") return true;
  if (filter === "awaiting") return isDocumentAwaitingReview(document);
  return document.processingStatus === filter;
}

function formatDuration(document: TIngestionDocument): string {
  const startedAt = new Date(document.createdAt).getTime();
  const updatedAt = new Date(document.updatedAt).getTime();
  if (Number.isNaN(startedAt) || Number.isNaN(updatedAt) || updatedAt < startedAt) {
    return "Unknown";
  }

  const minutes = Math.max(0, Math.round((updatedAt - startedAt) / 60_000));
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const documentResource = useDocuments(ACTIVITY_DOCUMENT_PARAMS);
  const datasetResource = useDatasets(ACTIVITY_DATASET_PARAMS);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [modeFilter, setModeFilter] = useState("all-mode");

  const datasetsById = useMemo(
    () => new Map(datasetResource.items.map((dataset) => [dataset.id, dataset.name])),
    [datasetResource.items],
  );

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documentResource.items.filter((document) => {
      const datasetName = getDocumentDatasetName(document, datasetsById);
      const matchSearch =
        !query ||
        document.filename.toLowerCase().includes(query) ||
        datasetName.toLowerCase().includes(query);
      const matchStatus = matchesStatusFilter(document, statusFilter);
      const matchMode = modeFilter === "all-mode" || getDocumentMode(document) === modeFilter;
      return matchSearch && matchStatus && matchMode;
    });
  }, [datasetsById, documentResource.items, modeFilter, search, statusFilter]);

  const selectedDocument =
    filteredDocuments.find((document) => document.id === selectedDocumentId) ?? null;

  const stats = {
    total: documentResource.total || documentResource.items.length,
    complete: documentResource.items.filter((document) => document.processingStatus === "completed").length,
    running: documentResource.items.filter(isDocumentActivelyProcessing).length,
    failed: documentResource.items.filter((document) => document.processingStatus === "failed").length,
  };

  const refresh = () => {
    void Promise.all([documentResource.refresh(), datasetResource.refresh()]);
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/40">
      <Topbar title="Activity" />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-5">
          {(documentResource.error || datasetResource.error) && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <AlertCircle className="size-4 flex-shrink-0" />
              <span>{documentResource.error || datasetResource.error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: "Total", value: stats.total, color: "bg-white border-gray-200 text-gray-700" },
              { label: "Complete", value: stats.complete, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              { label: "Running", value: stats.running, color: "bg-blue-50 border-blue-200 text-blue-700" },
              { label: "Failed", value: stats.failed, color: "bg-red-50 border-red-200 text-red-700" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm text-sm font-medium",
                  stat.color,
                )}
              >
                <span className="font-bold tabular-nums">{stat.value}</span>
                <span className="opacity-70">{stat.label}</span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-xl transition-colors"
              >
                <RefreshCw
                  className={cn(
                    "size-3.5",
                    (documentResource.isValidating || datasetResource.isValidating) && "animate-spin",
                  )}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                placeholder="Search activity..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9 pr-4 w-60 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-300 transition-all placeholder:text-gray-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-40 text-xs border-gray-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="h-9 w-32 text-xs border-gray-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-mode">All Modes</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="guided">Guided</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 h-9 px-3 text-xs text-gray-500 border border-gray-200 rounded-xl ml-auto">
              <Calendar className="size-3.5" />
              Latest {documentResource.items.length}
            </div>
          </div>

          <div className="flex gap-5">
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                <p className="text-xs text-gray-500">
                  {filteredDocuments.length} result{filteredDocuments.length !== 1 ? "s" : ""}
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Document</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Dataset</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Mode</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Updated</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Duration</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDocuments.map((document) => {
                    const iconStyle = getDocumentIconStyle(document);
                    const isSelected = selectedDocument?.id === document.id;
                    return (
                      <tr
                        key={document.id}
                        onClick={() => setSelectedDocumentId(isSelected ? null : document.id)}
                        className={cn(
                          "cursor-pointer transition-colors group",
                          isSelected ? "bg-indigo-50/60" : "hover:bg-gray-50/60",
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                                iconStyle.bg,
                              )}
                            >
                              <iconStyle.icon
                                className={cn(
                                  "size-3.5",
                                  iconStyle.color,
                                  iconStyle.icon === Loader2 && "animate-spin",
                                )}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                              {document.filename}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-gray-500 truncate max-w-xs block">
                            {getDocumentDatasetName(document, datasetsById)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <ModeBadge mode={getDocumentMode(document)} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={getDocumentStatusValue(document.processingStatus)} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-400">
                          {getDocumentUploadedAtLabel(document)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Timer className="size-3 text-gray-400" />
                            {formatDuration(document)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <ChevronRight
                            className={cn(
                              "size-4 transition-all",
                              isSelected
                                ? "text-indigo-500 rotate-90"
                                : "text-gray-300 group-hover:text-gray-500",
                            )}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {documentResource.isLoading && (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <Loader2 className="size-8 text-indigo-300 mx-auto mb-2 animate-spin" />
                        <p className="text-sm font-medium text-gray-500">Loading activity</p>
                      </td>
                    </tr>
                  )}

                  {!documentResource.isLoading && filteredDocuments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <TrendingUp className="size-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-500">No activity matches your filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedDocument && (
              <DetailPanel
                document={selectedDocument}
                datasetName={getDocumentDatasetName(selectedDocument, datasetsById)}
                onClose={() => setSelectedDocumentId(null)}
                onOpenDocument={() => navigate(`/documents/${selectedDocument.id}`)}
                onOpenStatus={() => navigate(`/ingestions/status?document_id=${selectedDocument.id}`)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailPanel({
  document,
  datasetName,
  onClose,
  onOpenDocument,
  onOpenStatus,
}: {
  document: TIngestionDocument;
  datasetName: string;
  onClose: () => void;
  onOpenDocument: () => void;
  onOpenStatus: () => void;
}) {
  const logs = getIngestionLogs(document);
  const metrics = getIngestionMetrics(document);
  const error = getIngestionError(document);

  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2 leading-tight">{document.filename}</p>
          <div className="flex items-center gap-2">
            <ModeBadge mode={getDocumentMode(document)} />
            <StatusBadge status={getDocumentStatusValue(document.processingStatus)} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-gray-50 space-y-2">
        {[
          { icon: Database, label: "Dataset", value: datasetName },
          { icon: Clock, label: "Updated", value: getDocumentUploadedAtLabel(document) },
          { icon: Timer, label: "Duration", value: formatDuration(document) },
          { icon: FileText, label: "Status", value: getDocumentStatusLabel(document.processingStatus) },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2.5 text-xs">
            <row.icon className="size-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500 w-16 flex-shrink-0">{row.label}</span>
            <span className="font-medium text-gray-800 truncate">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-b border-gray-50 grid grid-cols-2 gap-3">
        {[
          { label: "Chunks", value: metrics.totalChunks ?? metrics.storedChunks ?? 0 },
          { label: "Vectors", value: metrics.vectorizedChunks ?? 0 },
          { label: "Elements", value: metrics.elementsDetected ?? 0 },
          { label: "Version", value: metrics.chunkVersion ?? "-" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
            <p className="text-sm font-semibold text-gray-900 tabular-nums">{metric.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Event Log</p>

        {logs.length > 0 ? (
          <div className="relative space-y-0">
            {logs.map((event, index) => (
              <div key={`${event.timestamp}-${index}`} className="flex gap-3 pb-3 relative">
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center z-10 relative",
                      event.level === "error"
                        ? "bg-red-100"
                        : event.level === "warn"
                          ? "bg-amber-100"
                          : "bg-emerald-100",
                    )}
                  >
                    {event.level === "error" ? (
                      <AlertCircle className="size-3 text-red-600" />
                    ) : (
                      <CheckCircle2
                        className={cn(
                          "size-3",
                          event.level === "warn" ? "text-amber-600" : "text-emerald-600",
                        )}
                      />
                    )}
                  </div>
                  {index < logs.length - 1 && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-5 w-px h-3 bg-gray-200" />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs mt-0.5 leading-relaxed",
                      event.level === "error" ? "text-red-700 font-medium" : "text-gray-700",
                    )}
                  >
                    {event.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatIngestionLogTime(event.timestamp)}
                    {event.stage ? ` - ${event.stage}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              No structured backend log entries were returned for this document yet.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-red-800 font-semibold mb-1">Error Details</p>
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-50 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5" onClick={onOpenDocument}>
          <FileText className="size-3.5" />
          View Doc
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5" onClick={onOpenStatus}>
          <ArrowUpRight className="size-3.5" />
          Status
        </Button>
      </div>
    </div>
  );
}
