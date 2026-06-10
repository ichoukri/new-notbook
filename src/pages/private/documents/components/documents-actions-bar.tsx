import { Download } from "lucide-react";

type DocumentsActionsBarProps = {
  documentCount: number;
  onExport: () => void;
};

export function DocumentsActionsBar({
  documentCount,
  onExport,
}: DocumentsActionsBarProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-400">
        {documentCount} document{documentCount !== 1 ? "s" : ""}
      </p>
      <button
        type="button"
        onClick={onExport}
        className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50"
        disabled={documentCount === 0}
      >
        <Download className="size-3.5" />
        Export CSV
      </button>
    </div>
  );
}
