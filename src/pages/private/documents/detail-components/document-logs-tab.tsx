import { AlertCircle, CheckCircle2, Clock3, ScrollText, TriangleAlert } from "lucide-react";
import type { TIngestionLog } from "@/core/ingestions";
import { cn } from "@/lib/utils";

export function DocumentLogsTab({ logs }: { logs: TIngestionLog[] }) {
  const errorCount = logs.filter((log) => log.level === "error").length;
  const warningCount = logs.filter((log) => log.level === "warn").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="size-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-950">Ingestion activity</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">A chronological record of pipeline events.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
            {logs.length.toLocaleString()} events
          </span>
          {warningCount > 0 && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
              {warningCount} warnings
            </span>
          )}
          {errorCount > 0 && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
              {errorCount} errors
            </span>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {logs.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 text-center">
            <Clock3 className="size-7 text-gray-300" />
            <p className="mt-3 text-sm font-bold text-gray-700">No activity recorded</p>
            <p className="mt-1 text-xs text-gray-400">Pipeline events will appear here as ingestion runs.</p>
          </div>
        ) : (
          <div className="relative max-w-4xl">
            <div className="absolute bottom-5 left-[17px] top-5 w-px bg-gray-200" />
            <div className="space-y-1">
              {logs.map((log, index) => (
                <LogRow key={`${log.timestamp}-${log.message}-${index}`} log={log} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LogRow({ log }: { log: TIngestionLog }) {
  const Icon = log.level === "error" ? AlertCircle : log.level === "warn" ? TriangleAlert : CheckCircle2;
  return (
    <div className="group relative flex items-start gap-4 rounded-xl px-1 py-3 transition-colors hover:bg-gray-50 sm:px-2">
      <div
        className={cn(
          "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border-4 border-white",
          log.level === "error"
            ? "bg-red-100 text-red-600"
            : log.level === "warn"
              ? "bg-amber-100 text-amber-600"
              : "bg-emerald-100 text-emerald-600",
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[13px] font-semibold leading-5 text-gray-800">{log.message}</p>
          {log.step && (
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-600">
              {log.step}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
          <span>{log.timestamp}</span>
          {log.stage && (
            <>
              <span className="size-1 rounded-full bg-gray-300" />
              <span className="capitalize">{log.stage}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
