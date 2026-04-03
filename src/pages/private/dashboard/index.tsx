import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { StatusBadge, ModeBadge } from "@/components/app/status-badge";
import { DATASETS, ACTIVITY_LOGS } from "@/data/mock";
import {
  Database, FileText, Layers, Cpu, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, ArrowRight, Zap, Box, ArrowUpRight,
  Activity, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAT_CARDS = [
  {
    label: "Total Datasets", value: "24", delta: "+2 this week", trend: "+9%",
    icon: Database, color: "text-indigo-600", bg: "bg-indigo-50",
    border: "border-t-indigo-400", gradient: "from-indigo-50",
  },
  {
    label: "Total Documents", value: "2,700", delta: "+142 this week", trend: "+5.5%",
    icon: FileText, color: "text-blue-600", bg: "bg-blue-50",
    border: "border-t-blue-400", gradient: "from-blue-50",
  },
  {
    label: "Total Chunks", value: "71,540", delta: "+8,430 indexed", trend: "+13%",
    icon: Layers, color: "text-violet-600", bg: "bg-violet-50",
    border: "border-t-violet-400", gradient: "from-violet-50",
  },
  {
    label: "Embeddings", value: "71,540", delta: "text-embedding-3-large", trend: null,
    icon: Cpu, color: "text-emerald-600", bg: "bg-emerald-50",
    border: "border-t-emerald-400", gradient: "from-emerald-50",
  },
];

const QUICK_STATS = [
  { label: "Docs Processed This Week", value: "142", icon: TrendingUp, status: "positive", sub: "vs 98 last week" },
  { label: "Pending Guided Approvals", value: "3", icon: Clock, status: "warning", sub: "Awaiting review" },
  { label: "Failed Jobs", value: "2", icon: AlertTriangle, status: "danger", sub: "Click to investigate" },
  { label: "Ready for Retrieval", value: "2,685", icon: CheckCircle2, status: "positive", sub: "Indexed & live" },
];

const SYSTEM_STATUS = [
  { label: "Vector Store", value: "Healthy", icon: Box, type: "healthy" },
  { label: "Embedding Model", value: "3-large", icon: Cpu, type: "info" },
  { label: "Ingestion Queue", value: "2 running", icon: Zap, type: "running" },
  { label: "API Gateway", value: "Online", icon: Activity, type: "healthy" },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/40">
      <Topbar title="Dashboard" />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className={cn(
                "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-t-2 hover:shadow-md transition-shadow cursor-default group",
                card.border
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.bg)}>
                  <card.icon className={cn("size-5", card.color)} />
                </div>
                {card.trend && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <TrendingUp className="size-2.5" />
                    {card.trend}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
              <p className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-400 mt-1">{card.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Left: Quick stats + recent activity */}
          <div className="col-span-2 space-y-5">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              {QUICK_STATS.map((s) => (
                <div
                  key={s.label}
                  className={cn(
                    "bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-default",
                    s.status === "danger" ? "border-red-100 hover:border-red-200" :
                    s.status === "warning" ? "border-amber-100 hover:border-amber-200" :
                    "border-gray-100"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      s.status === "positive" ? "bg-emerald-50" :
                      s.status === "warning" ? "bg-amber-50" : "bg-red-50"
                    )}
                  >
                    <s.icon className={cn(
                      "size-5",
                      s.status === "positive" ? "text-emerald-600" :
                      s.status === "warning" ? "text-amber-600" : "text-red-600"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{s.value}</p>
                    <p className="text-xs font-medium text-gray-600 truncate">{s.label}</p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent ingestions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Recent Ingestions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Latest file processing activity</p>
                </div>
                <button
                  onClick={() => navigate("/activity")}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  View all <ArrowRight className="size-3" />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {ACTIVITY_LOGS.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/60 transition-colors cursor-pointer group"
                    onClick={() => navigate("/activity")}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      log.status === "complete" ? "bg-emerald-50" :
                      log.status === "failed" ? "bg-red-50" :
                      log.status === "embedding" ? "bg-blue-50" : "bg-gray-50"
                    )}>
                      <FileText className={cn(
                        "size-3.5",
                        log.status === "complete" ? "text-emerald-600" :
                        log.status === "failed" ? "text-red-600" :
                        log.status === "embedding" ? "text-blue-600" : "text-gray-400"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{log.document}</p>
                      <p className="text-xs text-gray-400 truncate">{log.dataset}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ModeBadge mode={log.mode} />
                      <StatusBadge status={log.status} />
                      <span className="text-xs text-gray-400 w-20 text-right hidden md:block">{log.startedAt}</span>
                    </div>
                    <ArrowUpRight className="size-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: System status + top datasets */}
          <div className="space-y-4">
            {/* System status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">System Status</h3>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <RefreshCw className="size-3.5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-3">
                {SYSTEM_STATUS.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="size-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                      item.type === "healthy" ? "text-emerald-700 bg-emerald-50" :
                      item.type === "running" ? "text-blue-700 bg-blue-50" :
                      "text-gray-600 bg-gray-100"
                    )}>
                      {item.type === "healthy" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {item.type === "running" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      {item.value}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Storage Used</span>
                    <span className="text-xs font-semibold text-gray-700">68%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full" style={{ width: "68%" }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">13.6 GB of 20 GB used</p>
                </div>
              </div>
            </div>

            {/* Top datasets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Top Datasets</h3>
                <button
                  onClick={() => navigate("/datasets")}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  All <ArrowRight className="size-3" />
                </button>
              </div>
              <div className="space-y-2">
                {DATASETS.slice(0, 4).map((ds, i) => (
                  <div
                    key={ds.id}
                    className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors group"
                    onClick={() => navigate(`/datasets/${ds.id}`)}
                  >
                    <span className="text-xs font-bold text-gray-300 w-4 tabular-nums">{i + 1}</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Database className="size-3.5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                        {ds.name}
                      </p>
                      <p className="text-xs text-gray-400">{ds.documents.toLocaleString()} docs</p>
                    </div>
                    <StatusBadge status={ds.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions CTA */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 rounded-2xl p-5 text-white">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full border-4 border-white" />
                <div className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full border-4 border-white" />
              </div>
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <Zap className="size-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Start Ingesting</h3>
                <p className="text-xs text-indigo-200 mb-4 leading-relaxed">
                  Upload a file and choose Auto or Guided mode
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full text-indigo-700 font-semibold"
                  onClick={() => navigate("/ingestions/new")}
                >
                  New Ingestion
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
