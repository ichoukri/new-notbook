import { mapSourceRelativePaths } from "@/core/source-provenance";

export type TRetrievalSearchMode =
  | "semantic"
  | "hybrid"
  | "keyword"
  | "graph_mix";
export type TRetrievalQueryExpansionMode = "none" | "multi_query";
type TRetrievalEmbeddingMode = "summary" | "raw" | "pending";
export type TRetrievalGraphOutcome =
  | "ok"
  | "no_seeds"
  | "no_graph_evidence"
  | "disabled_fallback"
  | "unavailable_fallback"
  | "no_documents_in_scope";

export type TRetrievalSearchRequest = {
  query: string;
  search_mode: TRetrievalSearchMode;
  query_expansion: TRetrievalQueryExpansionMode;
  top_k: number;
  candidate_k: number | null;
  scope: {
    document_ids?: string[] | null;
    dataset_id?: string | null;
  };
  filters: {
    content_types: string[];
  };
  debug: boolean;
};

export type TBackendRetrievalQueryDebug = {
  query: string;
  candidate_count: number;
  graph_outcome?: TRetrievalGraphOutcome | null;
  graph_seed_count?: number;
  graph_evidence_count?: number;
};

export type TBackendRetrievalSearchDebug = {
  expanded_queries: string[];
  candidate_limit: number;
  per_query_candidate_counts: TBackendRetrievalQueryDebug[];
  final_candidate_count: number;
  graph_outcome?: TRetrievalGraphOutcome | null;
  graph_seed_count?: number;
  graph_evidence_count?: number;
};

export type TBackendRetrievalSearchResponse = {
  query: string;
  search_mode: TRetrievalSearchMode;
  query_expansion: TRetrievalQueryExpansionMode;
  top_k: number;
  hits: TBackendRetrievalSearchHit[];
  debug: TBackendRetrievalSearchDebug | null;
};

export type TRetrievalSearchDebug = {
  expandedQueries: string[];
  candidateLimit: number;
  perQueryCandidateCounts: {
    query: string;
    candidateCount: number;
    graphOutcome: TRetrievalGraphOutcome | null;
    graphSeedCount: number;
    graphEvidenceCount: number;
  }[];
  finalCandidateCount: number;
  graphOutcome: TRetrievalGraphOutcome | null;
  graphSeedCount: number;
  graphEvidenceCount: number;
};

export type TBackendRetrievalSearchHit = {
  chunk_id: string;
  document_id: string;
  document_filename: string;
  document_file_type: string;
  dataset_ids: string[];
  page_number?: number | null;
  chunk_index: number;
  token_count?: number | null;
  content_types: string[];
  score: number;
  excerpt: string;
  text_content: string;
  embed_text: string;
  embedding_mode: TRetrievalEmbeddingMode;
  embedding_model?: string | null;
  summary_model?: string | null;
  vector_store?: string | null;
  chunk_metadata?: Record<string, unknown> | null;
  source_url?: string | null;
  source_relative_path?: string | null;
  source_relative_paths?: string[] | null;
};

export type TRetrievalSearchHit = {
  chunkId: string;
  documentId: string;
  documentFilename: string;
  documentFileType: string;
  datasetIds: string[];
  pageNumber?: number | null;
  chunkIndex: number;
  tokenCount?: number | null;
  contentTypes: string[];
  score: number;
  excerpt: string;
  textContent: string;
  embedText: string;
  embeddingMode: TRetrievalEmbeddingMode;
  embeddingModel?: string | null;
  summaryModel?: string | null;
  vectorStore?: string | null;
  chunkMetadata?: Record<string, unknown> | null;
  sourceUrl?: string | null;
  sourceRelativePaths: string[];
};

export type TBackendGroundedCitation = {
  number: number;
  chunk_id: string;
  document_id: string;
  document_filename: string;
  page_number?: number | null;
  excerpt: string;
  source_url?: string | null;
  source_relative_path?: string | null;
  source_relative_paths?: string[] | null;
};

export type TGroundedCitation = {
  number: number;
  chunkId: string;
  documentId: string;
  documentFilename: string;
  pageNumber?: number | null;
  excerpt: string;
  sourceUrl?: string | null;
  sourceRelativePaths: string[];
};

export type TRetrievalAbstentionReason =
  | "no_evidence"
  | "insufficient_context"
  | "invalid_grounding"
  | "generation_failed";

export type TBackendGroundedAnswerResponse = {
  query: string;
  answer: string;
  abstained: boolean;
  abstention_reason?: TRetrievalAbstentionReason | null;
  citation_indices: number[];
  citations: TBackendGroundedCitation[];
  hits: TBackendRetrievalSearchHit[];
  retrieval_debug?: TBackendRetrievalSearchDebug | null;
};

export type TGroundedAnswerResponse = {
  query: string;
  answer: string;
  abstained: boolean;
  abstentionReason: TRetrievalAbstentionReason | null;
  citationIndices: number[];
  citations: TGroundedCitation[];
  hits: TRetrievalSearchHit[];
  retrievalDebug: TRetrievalSearchDebug | null;
};

export type TKnowledgeChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type TKnowledgeChatRequest = {
  message: string;
  dataset_id: string;
  history: TKnowledgeChatTurn[];
  top_k: number;
};

export type TBackendKnowledgeChatResponse = TBackendGroundedAnswerResponse & {
  message: string;
  resolved_query: string;
};

export type TKnowledgeChatResponse = TGroundedAnswerResponse & {
  message: string;
  resolvedQuery: string;
};

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

export function mapBackendRetrievalSearchHit(
  hit: TBackendRetrievalSearchHit,
): TRetrievalSearchHit {
  return {
    chunkId: hit.chunk_id,
    documentId: hit.document_id,
    documentFilename: hit.document_filename,
    documentFileType: hit.document_file_type,
    datasetIds: hit.dataset_ids,
    pageNumber: hit.page_number ?? null,
    chunkIndex: hit.chunk_index,
    tokenCount: hit.token_count ?? null,
    contentTypes: hit.content_types,
    score: hit.score,
    excerpt: hit.excerpt,
    textContent: hit.text_content,
    embedText: hit.embed_text,
    embeddingMode: hit.embedding_mode,
    embeddingModel: hit.embedding_model ?? null,
    summaryModel: hit.summary_model ?? null,
    vectorStore: hit.vector_store ?? null,
    chunkMetadata: hit.chunk_metadata ?? null,
    sourceUrl: hit.source_url ?? null,
    sourceRelativePaths: mapSourceRelativePaths(
      hit.source_relative_paths,
      hit.source_relative_path,
    ),
  };
}

export function getRetrievalPrimaryContentType(
  result: TRetrievalSearchHit,
): string {
  return result.contentTypes[0] ?? "text";
}

export function getRetrievalSectionTitle(result: TRetrievalSearchHit): string {
  const metadata = getRecord(result.chunkMetadata);
  const explicitTitle =
    getString(metadata?.section_title) ??
    getString(metadata?.title) ??
    getString(metadata?.heading);
  if (explicitTitle) {
    return truncate(explicitTitle, 88);
  }

  const source = (result.embedText || result.textContent || result.excerpt).trim();
  if (!source) {
    return `Chunk ${result.chunkIndex + 1}`;
  }

  const firstLine = source.split(/\n+/)[0]?.trim() ?? source;
  return truncate(firstLine, 88);
}

export function getRetrievalTokenCount(result: TRetrievalSearchHit): number {
  if (typeof result.tokenCount === "number" && Number.isFinite(result.tokenCount)) {
    return result.tokenCount;
  }

  const source = result.embedText || result.textContent || result.excerpt;
  return Math.max(1, Math.round(source.length / 4));
}

export function getRetrievalLanguage(result: TRetrievalSearchHit): string {
  const metadata = getRecord(result.chunkMetadata);
  return (
    getString(metadata?.language) ??
    getString(metadata?.lang) ??
    "unknown"
  );
}

export function getRetrievalTags(
  result: TRetrievalSearchHit,
  options?: {
    datasetNamesById?: Map<string, string>;
  },
): string[] {
  const tags = new Set<string>();

  for (const type of result.contentTypes.slice(1)) {
    tags.add(type);
  }

  tags.add(result.embeddingMode);
  tags.add(result.documentFileType.toUpperCase());

  const datasetName = result.datasetIds
    .map((datasetId) => options?.datasetNamesById?.get(datasetId))
    .find(Boolean);
  if (datasetName) {
    tags.add(datasetName);
  }

  const metadata = getRecord(result.chunkMetadata);
  const explicitTags = metadata?.tags;
  if (Array.isArray(explicitTags)) {
    for (const tag of explicitTags) {
      if (typeof tag === "string" && tag.trim()) {
        tags.add(tag.trim());
      }
    }
  }

  return Array.from(tags).slice(0, 5);
}

export function mapBackendRetrievalSearchDebug(
  debug: TBackendRetrievalSearchDebug,
): TRetrievalSearchDebug {
  return {
    expandedQueries: debug.expanded_queries,
    candidateLimit: debug.candidate_limit,
    perQueryCandidateCounts: debug.per_query_candidate_counts.map((item) => ({
      query: item.query,
      candidateCount: item.candidate_count,
      graphOutcome: item.graph_outcome ?? null,
      graphSeedCount: item.graph_seed_count ?? 0,
      graphEvidenceCount: item.graph_evidence_count ?? 0,
    })),
    finalCandidateCount: debug.final_candidate_count,
    graphOutcome: debug.graph_outcome ?? null,
    graphSeedCount: debug.graph_seed_count ?? 0,
    graphEvidenceCount: debug.graph_evidence_count ?? 0,
  };
}

export function mapBackendGroundedAnswerResponse(
  response: TBackendGroundedAnswerResponse,
): TGroundedAnswerResponse {
  return {
    query: response.query,
    answer: response.answer,
    abstained: response.abstained,
    abstentionReason: response.abstention_reason ?? null,
    citationIndices: response.citation_indices,
    citations: response.citations.map((citation) => ({
      number: citation.number,
      chunkId: citation.chunk_id,
      documentId: citation.document_id,
      documentFilename: citation.document_filename,
      pageNumber: citation.page_number ?? null,
      excerpt: citation.excerpt,
      sourceUrl: citation.source_url ?? null,
      sourceRelativePaths: mapSourceRelativePaths(
        citation.source_relative_paths,
        citation.source_relative_path,
      ),
    })),
    hits: response.hits.map(mapBackendRetrievalSearchHit),
    retrievalDebug: response.retrieval_debug
      ? mapBackendRetrievalSearchDebug(response.retrieval_debug)
      : null,
  };
}

export function mapBackendKnowledgeChatResponse(
  response: TBackendKnowledgeChatResponse,
): TKnowledgeChatResponse {
  return {
    ...mapBackendGroundedAnswerResponse(response),
    message: response.message,
    resolvedQuery: response.resolved_query,
  };
}
