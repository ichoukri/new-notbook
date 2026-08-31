import { getChunkTokenCount } from "@/core/documents";
import type { TIngestionChunk } from "@/core/ingestions";

export type ChunkTab = "raw" | "embed" | "metadata";

export type ChunkMetadataField = {
  key: string;
  value: string;
};

export function getChunkPreview(chunk: TIngestionChunk): string {
  return (
    (chunk.summaryContent || chunk.textContent || "").trim() ||
    "No chunk content available."
  );
}

export function getPrimaryContentType(chunk: TIngestionChunk): string {
  return chunk.contentTypes[0] ?? "text";
}

export function formatJson(value: unknown): string {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

export function getChunkMetadataFields(
  chunk: TIngestionChunk,
): ChunkMetadataField[] {
  return [
    { key: "chunk_id", value: chunk.id },
    { key: "document_id", value: chunk.documentId },
    { key: "chunk_index", value: String(chunk.chunkIndex) },
    { key: "chunk_version", value: String(chunk.chunkVersion) },
    { key: "content_types", value: chunk.contentTypes.join(", ") || "text" },
    { key: "source_page", value: chunk.pageNumber ? String(chunk.pageNumber) : "" },
    { key: "token_count", value: String(getChunkTokenCount(chunk)) },
    { key: "char_count", value: String(chunk.charCount) },
    { key: "embedding_model", value: chunk.embeddingModel ?? "" },
    { key: "summary_model", value: chunk.summaryModel ?? "" },
    { key: "ingestion_status", value: chunk.ingestionStatus },
    { key: "is_active", value: String(chunk.isActive) },
  ];
}
