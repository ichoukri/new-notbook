import { backendApi } from "@/core/api";

export type TTransferJobKind = "export" | "import";

export type TTransferJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type TBackendTransferJob = {
  id: string;
  kind: TTransferJobKind;
  status: TTransferJobStatus;
  dataset_id?: string | null;
  dataset_name?: string | null;
  progress: Record<string, unknown>;
  result: Record<string, unknown>;
  error?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
};

export type TImportUploadTarget = {
  archive_key: string;
  upload_url: string;
  headers: Record<string, string>;
  expires_in: number;
};

export type TTransferDownload = {
  download_url: string;
  expires_in: number;
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30 * 60 * 1000;

export function startDatasetExport(
  datasetId: string,
): Promise<TBackendTransferJob> {
  return backendApi.create<TBackendTransferJob, Record<string, never>>(
    `/datasets/${datasetId}/export`,
    {},
  );
}

export function prepareImportUpload(): Promise<TImportUploadTarget> {
  return backendApi.create<TImportUploadTarget, Record<string, never>>(
    "/datasets/import/uploads",
    {},
  );
}

export async function uploadImportArchive(
  target: TImportUploadTarget,
  file: File,
): Promise<void> {
  const response = await fetch(target.upload_url, {
    method: "PUT",
    headers: target.headers,
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Archive upload failed (HTTP ${response.status}).`);
  }
}

export function startDatasetImport(payload: {
  archive_key: string;
  name?: string;
  target_group_id?: string;
}): Promise<TBackendTransferJob> {
  return backendApi.create<TBackendTransferJob, typeof payload>(
    "/datasets/import",
    payload,
  );
}

export function getTransferJob(jobId: string): Promise<TBackendTransferJob> {
  return backendApi.get<TBackendTransferJob>(`/transfer-jobs/${jobId}`);
}

export function getTransferDownload(
  jobId: string,
): Promise<TTransferDownload> {
  return backendApi.get<TTransferDownload>(`/transfer-jobs/${jobId}/download`);
}

export function getTransferStageLabel(job: TBackendTransferJob): string {
  const stage = job.progress?.stage;
  if (typeof stage !== "string" || !stage) {
    return job.status === "pending" ? "Waiting to start" : "Working";
  }
  const labels: Record<string, string> = {
    validate: "Validating archive",
    core: "Copying dataset records",
    files: "Transferring files",
    vectors: "Transferring embeddings",
    graph: "Transferring knowledge graph",
    upload: "Packaging archive",
  };
  return labels[stage] ?? stage;
}

export async function pollTransferJob(
  jobId: string,
  onUpdate?: (job: TBackendTransferJob) => void,
): Promise<TBackendTransferJob> {
  const startedAt = Date.now();

  for (;;) {
    const job = await getTransferJob(jobId);
    onUpdate?.(job);
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new Error("Transfer is taking too long; check back later.");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
