import { Clock, FileText, Layers } from "lucide-react";
import { ContentTypeBadge } from "@/components/app/status-badge";
import { formatFileSize } from "@/core/datasets";
import { getDocumentMode } from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";

export function DocumentOverviewTab({
  document,
  pageCount,
  chunkCount,
  contentTypeCounts,
  previewText,
}: {
  document: TIngestionDocument;
  pageCount: number | null;
  chunkCount: number;
  contentTypeCounts: Array<{ type: string; count: number }>;
  previewText: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pages", value: pageCount?.toLocaleString() ?? "—", icon: FileText },
          { label: "Chunks", value: chunkCount.toLocaleString(), icon: Layers },
          { label: "File Size", value: formatFileSize(document.fileSize), icon: FileText },
          {
            label: "Mode",
            value: getDocumentMode(document) === "auto" ? "Auto" : "Guided",
            icon: Clock,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center"
          >
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Content Types Detected
        </h3>
        <div className="flex gap-3 flex-wrap">
          {contentTypeCounts.length > 0 ? (
            contentTypeCounts.map((contentType) => (
              <div
                key={contentType.type}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100"
              >
                <ContentTypeBadge type={contentType.type} />
                <span className="text-xs text-gray-500">
                  {contentType.count.toLocaleString()} chunks
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">
              No chunk content has been generated yet.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Extracted Content Preview
        </h3>
        <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed h-40 overflow-y-auto whitespace-pre-wrap">
          {previewText ?? "Preview will appear once chunk content is available."}
        </div>
      </div>
    </div>
  );
}
