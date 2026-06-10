import { AlertCircle, Download, Loader2, RefreshCw, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CenteredCard,
  IngestionShell,
  StatusIcon,
} from "@/components/ingestion/ui";
import {
  type TIngestionDocument,
  type TIngestionLog,
  getDocumentStatusLabel,
} from "@/core/ingestions";
import { downloadLogs } from "./download-logs";

export function ErrorState({
  document,
  datasetName,
  errorMessage,
  errorTraceback,
  failedStage,
  logs,
  onRetry,
  isRetrying,
}: {
  document: TIngestionDocument;
  datasetName: string;
  errorMessage: string;
  errorTraceback: string | null;
  failedStage: string | null;
  logs: TIngestionLog[];
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const [showTraceback, setShowTraceback] = useState(false);

  return (
    <IngestionShell title="Ingestion Failed" center>
      <div className="w-full max-w-2xl">
        <CenteredCard>
          <StatusIcon icon={AlertCircle} tone="red" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Ingestion failed
          </h2>
          <p className="mb-2 text-sm text-gray-500">
            {document.filename} could not finish processing into {datasetName}.
          </p>
          {failedStage && (
            <p className="mb-2 text-xs text-gray-500">
              Stage:{" "}
              <span className="font-medium text-gray-700">
                {getDocumentStatusLabel(failedStage)}
              </span>
            </p>
          )}
          <p className="wrap-break-word mb-4 whitespace-pre-wrap rounded-xl bg-red-50 px-4 py-3 text-left text-xs text-red-600">
            {errorMessage}
          </p>
          {errorTraceback && (
            <div className="mb-6 text-left">
              <button
                type="button"
                onClick={() => setShowTraceback((value) => !value)}
                className="mb-2 text-xs text-gray-500 underline hover:text-gray-700"
              >
                {showTraceback ? "Hide" : "Show"} technical details
              </button>
              {showTraceback && (
                <pre className="max-h-96 overflow-auto whitespace-pre rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[11px] text-gray-700">
                  {errorTraceback}
                </pre>
              )}
            </div>
          )}
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-4" />
              )}
              Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadLogs(document.filename, logs)}
              disabled={logs.length === 0}
            >
              <Download className="mr-1.5 size-4" />
              Download logs
            </Button>
          </div>
        </CenteredCard>
      </div>
    </IngestionShell>
  );
}

export function LoadingState() {
  return (
    <IngestionShell title="Ingestion Status" center>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Loading ingestion status…
      </div>
    </IngestionShell>
  );
}

export function MissingState({
  message,
  onNavigate,
}: {
  message: string;
  onNavigate: (to: string) => void;
}) {
  return (
    <IngestionShell title="Ingestion Status" center>
      <CenteredCard>
        <StatusIcon icon={Upload} tone="gray" />
        <h2 className="mb-2 text-lg font-bold text-gray-900">
          No active ingestion
        </h2>
        <p className="mb-6 text-sm text-gray-500">{message}</p>
        <Button onClick={() => onNavigate("/ingestions/new")}>
          Start new ingestion
        </Button>
      </CenteredCard>
    </IngestionShell>
  );
}
