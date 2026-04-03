import { useState } from "react";
import Topbar from "@/components/app/topbar";
import { ACTIVITY_LOGS } from "@/data/mock";
import { StatusBadge, ModeBadge } from "@/components/app/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Search, Clock, ChevronRight, AlertCircle, CheckCircle2, Loader2,
  X, RefreshCw, FileText, Database, Timer, ArrowUpRight, Calendar,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Log = typeof ACTIVITY_LOGS[0];

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  complete: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Complete" },
  failed: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Failed" },
  embedding: { icon: Loader2, color: "text-blue-600", bg: "bg-blue-50", label: "Running" },
  queued: { icon: Clock, color: "text-gray-500", bg: "bg-gray-50", label: "Queued" },
};

export default function ActivityPage() {
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [modeFilter, setModeFilter] = useState("all-mode");

  const filtered = ACTIVITY_LOGS.filter((l) => {
    const matchSearch = l.document.toLowerCase().includes(search.toLowerCase()) ||
      l.dataset.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all-status" || l.status === statusFilter;
    const matchMode = modeFilter === "all-mode" || l.mode === modeFilter;
    return matchSearch && matchStatus && matchMode;
  });

  const stats = {
    total: ACTIVITY_LOGS.length,
    complete: ACTIVITY_LOGS.filter((l) => l.status === "complete").length,
    failed: ACTIVITY_LOGS.filter((l) => l.status === "failed").length,
    running: ACTIVITY_LOGS.filter((l) => l.status === "embedding").length,
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/40">
      <Topbar title="Activity" />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-5">
        {/* Summary pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "Total", value: stats.total, color: "bg-white border-gray-200 text-gray-700" },
            { label: "Complete", value: stats.complete, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { label: "Running", value: stats.running, color: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "Failed", value: stats.failed, color: "bg-red-50 border-red-200 text-red-700" },
          ].map((s) => (
            <div key={s.label} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm text-sm font-medium", s.color)}>
              <span className="font-bold tabular-nums">{s.value}</span>
              <span className="opacity-70">{s.label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-xl transition-colors">
              <RefreshCw className="size-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              placeholder="Search logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-4 w-60 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-300 transition-all placeholder:text-gray-400"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 text-xs border-gray-200 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">All Status</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="embedding">Running</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
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
          <button className="flex items-center gap-1.5 h-9 px-3 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors ml-auto">
            <Calendar className="size-3.5" />
            Date Range
          </button>
        </div>

        <div className="flex gap-5">
          {/* Log table */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
              <p className="text-xs text-gray-500">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Document</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Dataset</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Mode</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Started</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-2.5">Duration</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((log) => {
                  const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.queued;
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(isSelected ? null : log)}
                      className={cn(
                        "cursor-pointer transition-colors group",
                        isSelected ? "bg-indigo-50/60" : "hover:bg-gray-50/60"
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
                            {log.status === "embedding" ? (
                              <cfg.icon className={cn("size-3.5 animate-spin", cfg.color)} />
                            ) : (
                              <cfg.icon className={cn("size-3.5", cfg.color)} />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">{log.document}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-gray-500 truncate max-w-xs block">{log.dataset}</span>
                      </td>
                      <td className="px-5 py-3.5"><ModeBadge mode={log.mode} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={log.status} /></td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{log.startedAt}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Timer className="size-3 text-gray-400" />
                          {log.duration}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <ChevronRight className={cn(
                          "size-4 transition-all",
                          isSelected ? "text-indigo-500 rotate-90" : "text-gray-300 group-hover:text-gray-500"
                        )} />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <TrendingUp className="size-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-500">No logs match your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selectedLog && (
            <DetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
          )}
        </div>
              </div>
      </main>
    </div>
  );
}

function DetailPanel({ log, onClose }: { log: Log; onClose: () => void }) {
  const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.queued;

  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2 leading-tight">{log.document}</p>
          <div className="flex items-center gap-2">
            <ModeBadge mode={log.mode} />
            <StatusBadge status={log.status} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Meta */}
      <div className="px-5 py-4 border-b border-gray-50 space-y-2">
        {[
          { icon: Database, label: "Dataset", value: log.dataset },
          { icon: Clock, label: "Started", value: log.startedAt },
          { icon: Timer, label: "Duration", value: log.duration },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2.5 text-xs">
            <row.icon className="size-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500 w-16 flex-shrink-0">{row.label}</span>
            <span className="font-medium text-gray-800 truncate">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Event log */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Event Log</p>

        {/* Timeline */}
        <div className="relative space-y-0">
          {[
            { type: "info", msg: "Ingestion started", done: true },
            { type: "info", msg: "File type: PDF (187 pages)", done: true },
            { type: "info", msg: "Text extraction complete", done: true },
            { type: "info", msg: "Normalization & cleaning applied", done: true },
            { type: log.status === "failed" ? "error" : "info", msg: log.status === "failed" ? "Error: Embedding API timeout" : "Chunking complete", done: true },
            { type: "info", msg: log.status === "complete" ? "Indexed to vector store" : "—", done: log.status === "complete" },
          ].map((evt, i) => (
            <div key={i} className="flex gap-3 pb-3 relative">
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center z-10 relative",
                  evt.type === "error" ? "bg-red-100" :
                  evt.done ? "bg-emerald-100" : "bg-gray-100"
                )}>
                  {evt.type === "error" ? (
                    <AlertCircle className="size-3 text-red-600" />
                  ) : evt.done ? (
                    <CheckCircle2 className="size-3 text-emerald-600" />
                  ) : (
                    <div className="size-2 rounded-full bg-gray-300" />
                  )}
                </div>
                {i < 5 && (
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 top-5 w-px h-3",
                    evt.done ? "bg-emerald-200" : "bg-gray-200"
                  )} />
                )}
              </div>
              <p className={cn(
                "text-xs mt-0.5 leading-relaxed",
                evt.type === "error" ? "text-red-700 font-medium" :
                evt.done ? "text-gray-700" : "text-gray-400"
              )}>
                {evt.msg}
              </p>
            </div>
          ))}
        </div>

        {/* Error card */}
        {log.status === "failed" && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-red-800 font-semibold mb-1">Error Details</p>
            <p className="text-xs text-red-700 leading-relaxed">
              Embedding API timeout after 30s. Retry or switch to Guided Mode for manual review.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-50 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5">
          <FileText className="size-3.5" />
          View Doc
        </Button>
        {log.status === "failed" && (
          <Button size="sm" className="flex-1 text-xs gap-1.5">
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        )}
        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5">
          <ArrowUpRight className="size-3.5" />
          Details
        </Button>
      </div>
    </div>
  );
}
