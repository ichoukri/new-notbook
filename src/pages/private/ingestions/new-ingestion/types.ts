import type { LucideIcon } from "lucide-react";

export type IconComponent = LucideIcon;
export type IngestionMode = "auto" | "guided";
export type UploadStatus =
  | "pending"
  | "uploading"
  | "done"
  | "duplicate"
  | "error";

export type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
  documentId?: string;
};
