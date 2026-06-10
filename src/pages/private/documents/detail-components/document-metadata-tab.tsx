import { formatFileSize } from "@/core/datasets";
import {
  getDocumentDatasetId,
  getDocumentMode,
  getDocumentUploadedAtLabel,
} from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-control";

type DocumentMetrics = {
  embeddingModel?: string | null;
  summaryModel?: string | null;
  vectorStore?: string | null;
};

export function DocumentMetadataTab({
  document,
  pageCount,
  chunkCount,
  metrics,
}: {
  document: TIngestionDocument;
  pageCount: number | null;
  chunkCount: number;
  metrics: DocumentMetrics | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        {[
          { key: "document_id", value: document.id, copy: true },
          { key: "dataset_id", value: getDocumentDatasetId(document) ?? "—", copy: true },
          { key: "filename", value: document.filename, copy: true },
          { key: "hash", value: document.hash, copy: true },
          { key: "file_type", value: document.fileType },
          { key: "file_size", value: formatFileSize(document.fileSize) },
          { key: "pages", value: pageCount?.toString() ?? "—" },
          { key: "chunks", value: chunkCount.toString() },
          { key: "ingestion_mode", value: getDocumentMode(document) },
          { key: "status", value: document.processingStatus },
          { key: "uploaded_at", value: getDocumentUploadedAtLabel(document) },
          { key: "source_url", value: document.sourceUrl ?? "—", copy: true },
          { key: "task_id", value: document.taskId ?? "—", copy: true },
          { key: "user_id", value: document.userId ?? "—", copy: true },
          { key: "tenant_id", value: document.tenantId ?? "—", copy: true },
          { key: "embedding_model", value: metrics?.embeddingModel ?? "—" },
          { key: "summary_model", value: metrics?.summaryModel ?? "—" },
          { key: "vector_store", value: metrics?.vectorStore ?? "—" },
        ].map((field, index) => (
          <div
            key={field.key}
            className={cn(
              "group flex items-center gap-4 px-4 py-2.5",
              index % 2 === 0 ? "bg-gray-50/50" : "bg-white",
            )}
          >
            <span className="text-xs font-mono text-indigo-600 w-40 shrink-0">
              {field.key}
            </span>
            <span className="text-sm text-gray-700 break-all flex-1">
              {field.value}
            </span>
            {field.copy && (
              <CopyButton value={field.value} label={`${field.key} copied`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
