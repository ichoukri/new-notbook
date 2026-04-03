import { formatFileSize } from "@/core/datasets";
import {
  formatIngestionDateTime,
  getDocumentPreview,
  getDocumentStatusLabel,
  getIngestionLogs,
  getIngestionMetrics,
  type TIngestionChunk,
  type TIngestionDocument,
  type TIngestionLog,
} from "@/core/ingestions";
import type { TUser } from "@/core/types";

export type TBackendDocumentSearchHit = {
  chunk_id: string;
  chunk_index: number;
  page_number?: number | null;
  score: number;
  content_types: string[];
  excerpt: string;
};

export type TDocumentSearchHit = {
  chunkId: string;
  chunkIndex: number;
  pageNumber?: number | null;
  score: number;
  contentTypes: string[];
  excerpt: string;
};

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getDocumentMode(_document: TIngestionDocument): "auto" | "guided" {
  void _document;
  return "auto";
}

export function getDocumentDatasetId(document: TIngestionDocument): string | null {
  return document.datasetIds[0] ?? null;
}

export function getDocumentPageCount(
  document: TIngestionDocument,
  chunks: TIngestionChunk[] = [],
): number | null {
  const details = getRecord(document.processingDetails);
  const partitioning = getRecord(details?.partitioning);
  const explicitPageCount = getNumber(partitioning?.page_count);
  if (explicitPageCount !== null) {
    return explicitPageCount;
  }

  const pageNumbers = Array.from(
    new Set(
      chunks
        .map((chunk) => chunk.pageNumber)
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );

  return pageNumbers.length > 0 ? pageNumbers.length : null;
}

export function getDocumentChunkCount(
  document: TIngestionDocument,
  chunks: TIngestionChunk[] = [],
): number {
  const metrics = getIngestionMetrics(document);
  return (
    metrics.totalChunks ??
    metrics.storedChunks ??
    metrics.vectorizedChunks ??
    chunks.length
  );
}

export function getDocumentUploaderLabel(
  document: TIngestionDocument,
  currentUser: TUser | null | undefined,
): string {
  if (currentUser && document.userId === currentUser.id) {
    const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
    return fullName || currentUser.email;
  }

  return document.userId
    ? `User ${document.userId.slice(0, 8)}`
    : "Unknown User";
}

export function getDocumentStatusValue(status: string): string {
  if (status === "completed") {
    return "complete";
  }

  if (status === "partitioning") {
    return "extracting";
  }

  if (status === "vectorization") {
    return "embedding";
  }

  return status;
}

export function getDocumentFileSummary(document: TIngestionDocument): string {
  return `${document.fileType.toUpperCase()} · ${formatFileSize(document.fileSize)}`;
}

export function getDocumentUploadedAtLabel(document: TIngestionDocument): string {
  return formatIngestionDateTime(document.createdAt);
}

export function getDocumentPreviewText(chunks: TIngestionChunk[]): string | null {
  return getDocumentPreview(chunks);
}

export function getDocumentLogs(document: TIngestionDocument): TIngestionLog[] {
  return getIngestionLogs(document);
}

export function getDocumentContentTypeCounts(chunks: TIngestionChunk[]): Array<{
  type: string;
  count: number;
}> {
  const counts = new Map<string, number>();

  for (const chunk of chunks) {
    for (const type of chunk.contentTypes) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));
}

export function getChunkSectionTitle(chunk: TIngestionChunk): string {
  const source = (chunk.summaryContent || chunk.textContent || "").trim();
  if (!source) {
    return `Chunk ${chunk.chunkIndex + 1}`;
  }

  const firstLine = source.split(/\n+/)[0]?.trim() ?? source;
  return truncate(firstLine, 88);
}

export function getChunkTokenCount(chunk: TIngestionChunk): number {
  if (typeof chunk.tokenCount === "number" && Number.isFinite(chunk.tokenCount)) {
    return chunk.tokenCount;
  }

  return Math.max(1, Math.round(chunk.charCount / 4));
}

export function getChunkEmbeddingMode(
  chunk: TIngestionChunk,
): "summary" | "raw" | "pending" {
  if (chunk.summaryModel) {
    return "summary";
  }

  if (chunk.embeddingModel) {
    return "raw";
  }

  return "pending";
}

export function mapBackendDocumentSearchHit(
  hit: TBackendDocumentSearchHit,
): TDocumentSearchHit {
  return {
    chunkId: hit.chunk_id,
    chunkIndex: hit.chunk_index,
    pageNumber: hit.page_number ?? null,
    score: hit.score,
    contentTypes: hit.content_types,
    excerpt: hit.excerpt,
  };
}

export function buildDocumentsCsv(
  documents: TIngestionDocument[],
  options?: {
    datasetNamesById?: Map<string, string>;
    currentUser?: TUser | null;
  },
): string {
  const escape = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;

  const rows = documents.map((document) => {
    const datasetId = getDocumentDatasetId(document);
    const datasetName =
      (datasetId && options?.datasetNamesById?.get(datasetId)) || datasetId || "";

    return [
      escape(document.id),
      escape(document.filename),
      escape(datasetName),
      escape(getDocumentStatusLabel(document.processingStatus)),
      escape(getDocumentMode(document)),
      escape(document.fileType.toUpperCase()),
      escape(formatFileSize(document.fileSize)),
      escape(getDocumentChunkCount(document)),
      escape(getDocumentUploadedAtLabel(document)),
      escape(getDocumentUploaderLabel(document, options?.currentUser)),
    ].join(",");
  });

  return [
    [
      "id",
      "filename",
      "dataset",
      "status",
      "mode",
      "file_type",
      "file_size",
      "chunks",
      "uploaded_at",
      "uploaded_by",
    ].join(","),
    ...rows,
  ].join("\n");
}
