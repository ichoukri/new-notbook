import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { TIngestionLog } from "@/core/ingestions";
import { cn } from "@/lib/utils";

export function DocumentLogsTab({ logs }: { logs: TIngestionLog[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">
          Ingestion History
        </h3>
      </div>
      <div className="p-5">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">
            No ingestion logs are available yet.
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={`${log.timestamp}-${log.message}`}
                  className="flex items-start gap-4 pl-10 relative"
                >
                  <div
                    className={cn(
                      "absolute left-2.5 w-3 h-3 rounded-full border-2 border-white shadow-sm mt-0.5",
                      log.level === "error"
                        ? "bg-red-400"
                        : log.level === "warn"
                          ? "bg-amber-400"
                          : "bg-emerald-400",
                    )}
                  />
                  <div>
                    <p className="text-sm text-gray-700">{log.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.timestamp}
                      {log.step ? ` • ${log.step}` : ""}
                    </p>
                  </div>
                  {log.level !== "error" && (
                    <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 ml-auto shrink-0" />
                  )}
                  {log.level === "error" && (
                    <AlertCircle className="size-4 text-red-400 mt-0.5 ml-auto shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
