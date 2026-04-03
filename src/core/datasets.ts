export type TBackendDatasetStatus = "active" | "archived";

export type TBackendDatasetDocument = {
  id: string;
  hash: string;
  filename: string;
  file_size: number;
  file_type: string;
  source_url?: string | null;
  user_id: string;
  tanent_id: string;
  created_at: string;
  updated_at: string;
  task_id?: string | null;
  dataset_ids: string[];
  processing_status: string;
  processing_details?: Record<string, unknown> | null;
};

export type TBackendDataset = {
  id: string;
  name: string;
  description?: string | null;
  tenant_id: string;
  created_by: string;
  status: TBackendDatasetStatus;
  created_at: string;
  updated_at: string;
  tags?: string[] | null;
  dataset_metadata?: Record<string, unknown> | null;
  documents?: TBackendDatasetDocument[];
};

export type TDatasetDocument = {
  id: string;
  filename: string;
  fileSize: number;
  fileType: string;
  sourceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  processingStatus: string;
};

export type TDataset = {
  id: string;
  name: string;
  description: string;
  tenantId: string;
  createdBy: string;
  status: TBackendDatasetStatus;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  metadata: Record<string, unknown> | null;
  documents: TDatasetDocument[];
  documentCount: number;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function mapBackendDatasetDocument(
  document: TBackendDatasetDocument,
): TDatasetDocument {
  return {
    id: document.id,
    filename: document.filename,
    fileSize: document.file_size,
    fileType: document.file_type,
    sourceUrl: document.source_url ?? null,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
    processingStatus: document.processing_status,
  };
}

export function mapBackendDataset(dataset: TBackendDataset): TDataset {
  const documents = (dataset.documents ?? []).map(mapBackendDatasetDocument);

  return {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description ?? "",
    tenantId: dataset.tenant_id,
    createdBy: dataset.created_by,
    status: dataset.status,
    createdAt: dataset.created_at,
    updatedAt: dataset.updated_at,
    tags: dataset.tags ?? [],
    metadata: dataset.dataset_metadata ?? null,
    documents,
    documentCount: documents.length,
  };
}

export function formatDatasetDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return DATE_FORMATTER.format(date);
}

export function formatDatasetDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return DATE_TIME_FORMATTER.format(date);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatLabel(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
