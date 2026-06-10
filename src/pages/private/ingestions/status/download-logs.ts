import type { TIngestionLog } from "@/core/ingestions";

export function downloadLogs(filename: string, logs: TIngestionLog[]) {
  if (logs.length === 0) {
    return;
  }

  const content = logs
    .map(
      (log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`,
    )
    .join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename.replace(/\.[^.]+$/, "") || "ingestion"}-logs.txt`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
