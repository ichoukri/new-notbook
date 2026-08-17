import { env } from "@/config/env";
import { mapSourceRelativePaths } from "@/core/source-provenance";
import type { TPdfRegion } from "@/core/retrieval";

export type TDocumentMode = "auto" | "guided";
export type TEmbeddingProvider = "openai" | "qwen";
export type TSummaryProvider = "ollama" | "openai";
export type TSummaryModel =
  | "gpt-4.1-mini"
  | "qwen3-vl:30b-a3b-instruct-q8_0"
  | "qwen3.6:35b-a3b-mtp-q4_K_M"
  | "qwen3.6:35b-a3b-mtp-q8_0";

export type TBackendDocument = {
  id: string;
  hash: string;
  filename: string;
  file_size: number;
  file_type: string;
  source_url?: string | null;
  source_relative_path?: string | null;
  source_relative_paths?: string[] | null;
  user_id: string;
  tanent_id: string;
  created_at: string;
  updated_at: string;
  task_id?: string | null;
  dataset_ids: string[];
  processing_status: string;
  mode?: TDocumentMode;
  embedding_provider?: TEmbeddingProvider;
  embedding_profile?: string | null;
  summary_provider?: TSummaryProvider | null;
  summary_model?: TSummaryModel | null;
  processing_details?: Record<string, unknown> | null;
  doc_metadata?: Record<string, unknown> | null;
  access_policy?: Record<string, unknown> | null;
};

export type TAccessVisibility = "private" | "tenant" | "roles";

export type TDocumentMetadataPayload = {
  metadata: Record<string, unknown>;
  access_policy: {
    visibility: TAccessVisibility;
    role_ids: string[];
    user_ids: string[];
  };
  complete: boolean;
};

export type TBackendDocumentMutationResponse = {
  message: string;
  data: TBackendDocument;
  // Present on /finalize when the uploaded file already exists in the dataset.
  // ``reingested`` is true when a finished duplicate was re-queued in the
  // requested mode; false when an in-flight duplicate was returned as-is.
  duplicate?: boolean;
  reingested?: boolean;
  // ``revived`` is true when the duplicate was stranded in PENDING/QUEUED
  // (its ingestion task was lost) and the backend re-queued it.
  revived?: boolean;
  // ``streaming`` is true when an in-flight duplicate was returned untouched so
  // the client can (re-)attach to its live status stream.
  streaming?: boolean;
};

export type TBackendPrepareUploadRequest = {
  filename: string;
  source_relative_path: string | null;
  file_size: number;
  content_type: string | null;
};

export type TBackendPrepareUploadResponse = {
  document_id: string;
  object_key: string;
  source_url: string;
  upload_url: string;
  upload_method: "PUT";
  headers: Record<string, string>;
  expires_in: number;
};

// The file description is read back from the upload intent recorded at
// prepare-upload, so finalize carries only the id and the processing profile.
export type TBackendFinalizeRequest = {
  document_id: string;
  mode?: TDocumentMode;
  embedding_provider?: TEmbeddingProvider;
  summary_provider?: TSummaryProvider;
  summary_model?: TSummaryModel;
};

export type TBackendLocalChatModelsResponse = {
  provider: "ollama";
  online: boolean;
  base_url: string;
  default_model: Exclude<TSummaryModel, "gpt-4.1-mini">;
  openai_configured: boolean;
  openai_summary_model: "gpt-4.1-mini";
  models: Array<{
    provider: "ollama";
    model: Exclude<TSummaryModel, "gpt-4.1-mini">;
    label: string;
    size_gb: number;
    vision: boolean;
    installed: boolean;
  }>;
};

export type TBackendChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_version: number;
  page_number?: number | null;
  text_content: string;
  summary_content: string | null;
  char_count: number;
  token_count?: number | null;
  content_types: string[];
  original_content?: Record<string, unknown> | null;
  chunk_metadata?: Record<string, unknown> | null;
  content_hash?: string | null;
  vector_chunk_id?: string | null;
  embedding_model?: string | null;
  summary_model?: string | null;
  ingestion_status: string;
  error_message?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TIngestionStepKey =
  | "load_detect"
  | "extract"
  | "normalize"
  | "chunking"
  | "embed_text"
  | "graph"
  | "metadata"
  | "embedding"
  | "index";

export type TIngestionStepStatus =
  | "pending"
  | "active"
  | "complete"
  | "error";

export type TIngestionPipelineStep = {
  key: TIngestionStepKey;
  label: string;
  status: TIngestionStepStatus;
};

export type TIngestionLog = {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  stage?: string | null;
  step?: string | null;
};

// Guided-mode chunk-edit operations. Mirrors the backend discriminated union
// at ``POST /documents/{id}/stages/{stage}/edit``.
export type TChunkEditOperation =
  | {
      op: "edit";
      chunk_id: string;
      text_content?: string;
      summary_content?: string;
      content_types?: string[];
      chunk_metadata?: Record<string, unknown>;
    }
  | { op: "delete"; chunk_id: string }
  | {
      op: "split";
      chunk_id: string;
      // Empty text is valid when that segment owns at least one image.
      segments: string[];
      // For each source-chunk image (in imageUrls order), the index of the
      // resulting segment it attaches to. Omit → all images go to segment 0.
      image_segments?: number[];
    }
  | { op: "merge"; chunk_ids: string[]; separator?: string };

export type TIngestionDocument = {
  id: string;
  hash: string;
  filename: string;
  fileSize: number;
  fileType: string;
  sourceUrl?: string | null;
  sourceRelativePaths: string[];
  userId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  taskId?: string | null;
  datasetIds: string[];
  processingStatus: string;
  mode: TDocumentMode;
  processingDetails: Record<string, unknown> | null;
  docMetadata: Record<string, unknown> | null;
  accessPolicy: Record<string, unknown> | null;
};

export type TIngestionChunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkVersion: number;
  pageNumber?: number | null;
  textContent: string;
  summaryContent: string | null;
  charCount: number;
  tokenCount?: number | null;
  contentTypes: string[];
  originalContent?: Record<string, unknown> | null;
  chunkMetadata?: Record<string, unknown> | null;
  vectorChunkId?: string | null;
  embeddingModel?: string | null;
  summaryModel?: string | null;
  ingestionStatus: string;
  errorMessage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const INGESTION_PIPELINE_STEPS: Array<{
  key: TIngestionStepKey;
  label: string;
}> = [
  { key: "load_detect", label: "Load & Detect" },
  { key: "extract", label: "Extract" },
  { key: "normalize", label: "Normalize" },
  { key: "chunking", label: "Chunking" },
  { key: "embed_text", label: "Embed Text" },
  { key: "graph", label: "Knowledge Graph" },
  { key: "embedding", label: "Embedding" },
  { key: "metadata", label: "Metadata" },
  { key: "index", label: "Index" },
];

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getCurrentPipelineStep(
  document: TIngestionDocument,
): TIngestionStepKey {
  const details = getRecord(document.processingDetails);
  const pipeline = getRecord(details?.pipeline);
  const pipelineStep = getString(pipeline?.current_step);

  if (pipelineStep && isPipelineStepKey(pipelineStep)) {
    return pipelineStep;
  }

  switch (document.processingStatus) {
    case "queued":
    case "pending":
      return "load_detect";
    case "partitioning":
    case "partitioning_awaiting_approval":
      return "extract";
    case "chunking":
    case "chunking_awaiting_approval":
      return "chunking";
    case "summarising":
    case "summarising_awaiting_approval":
      return "embed_text";
    case "graph_extraction":
    case "graph_extraction_awaiting_approval":
      return "graph";
    case "vectorization":
    case "vectorization_awaiting_approval":
      return "embedding";
    case "metadata_awaiting_approval":
      return "metadata";
    case "completed":
      return "index";
    case "failed":
    case "cancelled":
      return "load_detect";
    default:
      return "load_detect";
  }
}

function isPipelineStepKey(value: string): value is TIngestionStepKey {
  return INGESTION_PIPELINE_STEPS.some((step) => step.key === value);
}

export function mapBackendDocument(document: TBackendDocument): TIngestionDocument {
  return {
    id: document.id,
    hash: document.hash,
    filename: document.filename,
    fileSize: document.file_size,
    fileType: document.file_type,
    sourceUrl: document.source_url ?? null,
    sourceRelativePaths: mapSourceRelativePaths(
      document.source_relative_paths,
      document.source_relative_path,
    ),
    userId: document.user_id,
    tenantId: document.tanent_id,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
    taskId: document.task_id ?? null,
    datasetIds: document.dataset_ids,
    processingStatus: document.processing_status,
    mode: document.mode ?? "auto",
    processingDetails: document.processing_details ?? null,
    docMetadata: document.doc_metadata ?? null,
    accessPolicy: document.access_policy ?? null,
  };
}

export function mapBackendChunk(chunk: TBackendChunk): TIngestionChunk {
  return {
    id: chunk.id,
    documentId: chunk.document_id,
    chunkIndex: chunk.chunk_index,
    chunkVersion: chunk.chunk_version,
    pageNumber: chunk.page_number ?? null,
    textContent: chunk.text_content,
    summaryContent: chunk.summary_content,
    charCount: chunk.char_count,
    tokenCount: chunk.token_count ?? null,
    contentTypes: chunk.content_types,
    originalContent: chunk.original_content ?? null,
    chunkMetadata: chunk.chunk_metadata ?? null,
    vectorChunkId: chunk.vector_chunk_id ?? null,
    embeddingModel: chunk.embedding_model ?? null,
    summaryModel: chunk.summary_model ?? null,
    ingestionStatus: chunk.ingestion_status,
    errorMessage: chunk.error_message ?? null,
    isActive: chunk.is_active,
    createdAt: chunk.created_at,
    updatedAt: chunk.updated_at,
  };
}

export function getIngestionPipeline(
  document: TIngestionDocument,
): TIngestionPipelineStep[] {
  const details = getRecord(document.processingDetails);
  const pipeline = getRecord(details?.pipeline);
  const steps = getArray(pipeline?.steps);

  if (steps.length) {
    const parsedSteps = steps
      .map((step) => {
        const record = getRecord(step);
        const key = getString(record?.key);
        const label = getString(record?.label);
        const status = getString(record?.status);

        if (
          key &&
          label &&
          status &&
          isPipelineStepKey(key) &&
          isPipelineStepStatus(status)
        ) {
          return { key, label, status };
        }

        return null;
      })
      .filter(Boolean) as TIngestionPipelineStep[];

    if (parsedSteps.length === INGESTION_PIPELINE_STEPS.length) {
      const byKey = new Map(parsedSteps.map((step) => [step.key, step]));
      if (byKey.size === INGESTION_PIPELINE_STEPS.length) {
        // Keep the customer-facing stage order stable even while backend
        // deployments roll out the new graph step in their pipeline payload.
        return INGESTION_PIPELINE_STEPS.map(
          (definition) => byKey.get(definition.key)!,
        );
      }
    }
  }

  const currentStep = getCurrentPipelineStep(document);
  const currentIndex = INGESTION_PIPELINE_STEPS.findIndex(
    (step) => step.key === currentStep,
  );

  return INGESTION_PIPELINE_STEPS.map((step, index) => {
    let status: TIngestionStepStatus = "pending";
    if (document.processingStatus === "completed") {
      status = "complete";
    } else if (document.processingStatus === "failed") {
      if (index < currentIndex) {
        status = "complete";
      } else if (index === currentIndex) {
        status = "error";
      }
    } else if (index < currentIndex) {
      status = "complete";
    } else if (index === currentIndex) {
      status = "active";
    }

    return {
      key: step.key,
      label: step.label,
      status,
    };
  });
}

function isPipelineStepStatus(value: string): value is TIngestionStepStatus {
  return ["pending", "active", "complete", "error"].includes(value);
}

export function getIngestionProgress(document: TIngestionDocument): number {
  const steps = getIngestionPipeline(document);
  const completeCount = steps.filter((step) => step.status === "complete").length;
  const hasActiveStep = steps.some((step) => step.status === "active");

  if (completeCount === steps.length) {
    return 100;
  }

  const value = ((completeCount + (hasActiveStep ? 0.5 : 0)) / steps.length) * 100;
  return Math.max(0, Math.min(99, Math.round(value)));
}

export function getIngestionLogs(
  document: TIngestionDocument,
): TIngestionLog[] {
  const details = getRecord(document.processingDetails);
  const logs = getArray(details?.logs);

  return logs
    .map((entry) => {
      const record = getRecord(entry);
      const timestamp = getString(record?.timestamp);
      const message = getString(record?.message);
      const level = getString(record?.level) ?? "info";

      if (!timestamp || !message) {
        return null;
      }

      return {
        timestamp,
        message,
        level: level === "error" || level === "warn" ? level : "info",
        stage: getString(record?.stage),
        step: getString(record?.step),
      };
    })
    .filter(Boolean) as TIngestionLog[];
}

export function getIngestionMetrics(document: TIngestionDocument): {
  elementsDetected: number | null;
  totalChunks: number | null;
  processedChunks: number | null;
  storedChunks: number | null;
  vectorizedChunks: number | null;
  graphEntities: number | null;
  graphRelations: number | null;
  chunkVersion: number | null;
  embeddingModel: string | null;
  summaryModel: string | null;
  vectorStore: string | null;
} {
  const details = getRecord(document.processingDetails);
  const partitioning = getRecord(details?.partitioning);
  const chunking = getRecord(details?.chunking);
  const summarising = getRecord(details?.summarising);
  const graphExtraction = getRecord(details?.graph_extraction);
  const vectorization = getRecord(details?.vectorization);
  const runtime = getRecord(details?.runtime);

  const elementsFound = getRecord(partitioning?.elements_found);
  const graphCounts = getRecord(graphExtraction?.counts);
  const elementsDetected = elementsFound
    ? Object.values(elementsFound).reduce<number>((sum, item) => {
        const value = getNumber(item);
        return sum + (value ?? 0);
      }, 0)
    : null;

  return {
    elementsDetected,
    totalChunks:
      getNumber(chunking?.total_chunks) ??
      getNumber(summarising?.total_chunks) ??
      getNumber(vectorization?.vectorized_chunks),
    processedChunks: getNumber(summarising?.current_chunk),
    storedChunks: getNumber(summarising?.stored_chunks),
    vectorizedChunks: getNumber(vectorization?.vectorized_chunks),
    graphEntities: getNumber(graphCounts?.entity_candidates),
    graphRelations: getNumber(graphCounts?.relation_candidates),
    chunkVersion:
      getNumber(vectorization?.chunk_version) ??
      getNumber(summarising?.chunk_version),
    embeddingModel: getString(runtime?.embedding_model),
    summaryModel: getString(runtime?.summary_model),
    vectorStore: getString(runtime?.vector_store),
  };
}

export function getIngestionError(document: TIngestionDocument): string | null {
  const details = getRecord(document.processingDetails);
  return getString(details?.error);
}

export function getIngestionErrorTraceback(
  document: TIngestionDocument,
): string | null {
  const details = getRecord(document.processingDetails);
  return getString(details?.error_traceback);
}

export function getIngestionFailedStage(
  document: TIngestionDocument,
): string | null {
  const details = getRecord(document.processingDetails);
  return getString(details?.failed_stage);
}

// Maps backend ``*_AWAITING_APPROVAL`` status strings to the ``{stage}`` slug
// the approve endpoint expects. Returns null when the document isn't paused
// for approval.
const _AWAITING_APPROVAL_STAGE_MAP: Record<string, string> = {
  partitioning_awaiting_approval: "partition",
  chunking_awaiting_approval: "chunking",
  summarising_awaiting_approval: "summarising",
  graph_extraction_awaiting_approval: "graph",
  vectorization_awaiting_approval: "vectorization",
};

export function getAwaitingApprovalStage(
  document: TIngestionDocument,
): string | null {
  return _AWAITING_APPROVAL_STAGE_MAP[document.processingStatus] ?? null;
}

export function isAwaitingApproval(document: TIngestionDocument): boolean {
  return getAwaitingApprovalStage(document) !== null;
}

// Mirrors the backend's TERMINAL_STATUSES: nothing further happens to a
// document in one of these states without an explicit user action.
const _TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function isTerminalStatus(status: string): boolean {
  return _TERMINAL_STATUSES.has(status);
}

/**
 * Whether a document is moving through (or about to enter) the pipeline, and so
 * may still stop at a guided-mode approval gate.
 *
 * This is what decides review-queue membership. A duplicate the backend
 * returned untouched because it was already in flight is just as likely to need
 * a decision as a freshly queued upload — the distinction that matters is the
 * document's status, not how the client came to hold it.
 */
export function isLiveInPipeline(status: string): boolean {
  return !isTerminalStatus(status);
}

// The final guided-mode gate is handled separately from the stage-approval
// flow: it has its own ``/metadata`` endpoint (save + finalize) rather than
// a ``/stages/{stage}/approve`` call.
export function isMetadataReview(document: TIngestionDocument): boolean {
  return document.processingStatus === "metadata_awaiting_approval";
}

/**
 * Most approvals a single guided document can require: one per stage gate plus
 * the final metadata gate. Derived from the stage map so it cannot drift when
 * stages are added or removed.
 */
export const GUIDED_GATES_PER_DOCUMENT =
  Object.keys(_AWAITING_APPROVAL_STAGE_MAP).length + 1;

export function shouldLoadIngestionChunksForStatus(status: string): boolean {
  switch (status) {
    case "vectorization":
    case "completed":
    case "failed":
    case "chunking_awaiting_approval":
    case "summarising_awaiting_approval":
    case "vectorization_awaiting_approval":
      return true;
    default:
      return false;
  }
}

export function shouldLoadIngestionChunks(document: TIngestionDocument): boolean {
  return shouldLoadIngestionChunksForStatus(document.processingStatus);
}

/**
 * Extract image URLs from a chunk's ``originalContent.images``.
 *
 * Backend stores these as chunk-asset paths (e.g.
 * ``/api/v1/chunks/assets/{doc}/{v}/{i}/foo.jpg``). Returns them as-is —
 * call ``buildChunkAssetUrl`` from ``@/core/api`` when constructing an
 * ``<img src>`` so the absolute URL hits the right backend origin.
 *
 * Returns an empty array when no images are present or when
 * ``originalContent`` has an unexpected shape.
 */
/**
 * Highlight regions stored on a chunk, or an empty list.
 *
 * Regions live under ``chunkMetadata.regions`` as top-left-origin page
 * fractions. Chunks ingested before coordinates were captured simply have none.
 */
export function getChunkRegions(chunk: TIngestionChunk): TPdfRegion[] {
  const raw = chunk.chunkMetadata?.regions;
  if (!Array.isArray(raw)) return [];
  const regions: TPdfRegion[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const region = entry as Record<string, unknown>;
    if (
      typeof region.page === "number" &&
      typeof region.l === "number" &&
      typeof region.t === "number" &&
      typeof region.r === "number" &&
      typeof region.b === "number"
    ) {
      regions.push({
        page: region.page,
        l: region.l,
        t: region.t,
        r: region.r,
        b: region.b,
        ...(typeof region.start === "number" ? { start: region.start } : {}),
        ...(typeof region.end === "number" ? { end: region.end } : {}),
        ...(region.stale === true ? { stale: true } : {}),
      });
    }
  }
  return regions;
}

export function getChunkImageUrls(chunk: TIngestionChunk): string[] {
  const oc = chunk.originalContent;
  if (!oc || typeof oc !== "object") return [];
  const images = (oc as Record<string, unknown>).images;
  if (!Array.isArray(images)) return [];
  return images.filter((value): value is string => typeof value === "string");
}

/**
 * Extract table HTML fragments from a chunk's ``originalContent.tables``.
 *
 * The backend stores tables as HTML strings (unstructured's
 * ``text_as_html``, e.g. ``<table><tr><td>…</td></tr></table>``) — NOT as
 * Markdown and NOT inside ``text_content``. Render the returned strings as
 * sanitised HTML to display real tables.
 *
 * Returns an empty array when no tables are present or when
 * ``originalContent`` has an unexpected shape.
 */
export function getChunkTables(chunk: TIngestionChunk): string[] {
  const oc = chunk.originalContent;
  if (!oc || typeof oc !== "object") return [];
  const tables = (oc as Record<string, unknown>).tables;
  if (!Array.isArray(tables)) return [];
  return tables.filter(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );
}

export function getDocumentPreview(chunks: TIngestionChunk[]): string | null {
  for (const chunk of chunks) {
    const value =
      (chunk.summaryContent ?? "").trim() ||
      (chunk.textContent ?? "").trim();
    if (value) {
      return value;
    }
  }

  return null;
}

export function formatIngestionDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return DATE_TIME_FORMATTER.format(date);
}

export function formatIngestionLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--:--";
  }

  return TIME_FORMATTER.format(date);
}

export function getDocumentStatusLabel(status: string): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "partitioning":
      return "Extracting";
    case "chunking":
      return "Chunking";
    case "summarising":
      return "Summarising";
    case "graph_extraction":
      return "Extracting knowledge graph";
    case "vectorization":
      return "Vectorizing";
    case "partitioning_awaiting_approval":
      return "Awaiting review (extract)";
    case "chunking_awaiting_approval":
      return "Awaiting review (chunks)";
    case "summarising_awaiting_approval":
      return "Awaiting review (summaries)";
    case "graph_extraction_awaiting_approval":
      return "Awaiting review (knowledge graph)";
    case "vectorization_awaiting_approval":
      return "Awaiting review (vectors)";
    case "metadata_awaiting_approval":
      return "Awaiting review (metadata)";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Most document ids to put directly in the stream URL.
 *
 * A UUID costs ~37 characters once comma-separated, and proxies commonly cap a
 * request line around 4–8 KB. Past this many, the roster is registered with
 * POST /documents/stream/subscriptions and the stream carries a short token
 * instead, which keeps filtering exact without growing the URL.
 */
export const MAX_STREAMED_DOCUMENT_IDS = 60;

export type TBackendStreamSubscription = {
  subscription: string;
  document_count: number;
  expires_in: number;
};

/** Whether a roster is too large to pass on the URL and needs a token. */
export function needsStreamSubscription(documentIds: string[]): boolean {
  return documentIds.filter(Boolean).length > MAX_STREAMED_DOCUMENT_IDS;
}

// The backend accepts a comma-separated ``document_ids`` filter, so one stream
// can back a whole batch instead of one connection per document. Large rosters
// pass a ``subscription`` token naming the same set.
export function buildDocumentStatusStreamUrl(params: {
  documentIds: string[];
  datasetId?: string | null;
  subscription?: string | null;
}): string {
  const searchParams = new URLSearchParams();
  const documentIds = params.documentIds.filter(Boolean);

  if (params.subscription) {
    searchParams.set("subscription", params.subscription);
  } else if (documentIds.length > 0) {
    searchParams.set("document_ids", documentIds.join(","));
  }
  if (params.datasetId) {
    searchParams.set("dataset_id", params.datasetId);
  }

  return `${env.VITE_BACKEND_URL.replace(/\/$/, "")}/documents/stream/status?${searchParams.toString()}`;
}
