import type { LucideIcon } from "lucide-react";

export type IconComponent = LucideIcon;
export type IngestionMode = "auto" | "guided";
export type EmbeddingProvider = "openai" | "qwen";
export type UploadStatus =
  | "pending"
  | "uploading"
  | "done"
  | "duplicate"
  | "error"
  | "cancelled";

export type UploadItem = {
  id: string;
  file: File;
  relativePath: string | null;
  status: UploadStatus;
  error?: string;
  documentId?: string;
  /** Dataset the upload was finalized against, for stage links. */
  datasetId?: string;
  /** Backend explanation for duplicates ("already ingested" vs "in flight"). */
  detail?: string;
  /**
   * The finalized document's processing status. Decides review-queue
   * membership: an in-flight duplicate can be sitting at an approval gate just
   * as a newly queued upload can, so the upload outcome alone is not enough.
   */
  processingStatus?: string;
  /**
   * Bytes transferred so far, 0–1. Undefined until the transfer starts, and
   * left undefined when the server reports no total to measure against.
   */
  progress?: number;
};
