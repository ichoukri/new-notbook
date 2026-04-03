export type DatasetStatus = "active" | "indexing" | "draft" | "error";
export type IngestionMode = "auto" | "guided";
export type IngestionStatus =
  | "queued"
  | "extracting"
  | "cleaned"
  | "chunked"
  | "embedding"
  | "indexed"
  | "failed"
  | "complete";
export type ContentType = "text" | "table" | "ocr" | "image" | "mixed" | "transcript";

export interface Dataset {
  id: string;
  name: string;
  description: string;
  owner: string;
  visibility: "public" | "private" | "team";
  documents: number;
  chunks: number;
  createdAt: string;
  tags: string[];
  status: DatasetStatus;
  embeddingModel: string;
}

export interface Document {
  id: string;
  datasetId: string;
  filename: string;
  fileType: string;
  fileSize: string;
  pages: number;
  chunks: number;
  status: IngestionStatus;
  mode: IngestionMode;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  index: number;
  contentType: ContentType;
  sourcePage: number;
  sectionTitle: string;
  tokenCount: number;
  preview: string;
  embedText: string;
  embeddingMode: "raw" | "normalized" | "summary" | "hybrid";
  language: string;
  tags: string[];
  score?: number;
}

export interface IngestionJob {
  id: string;
  datasetId: string;
  documentId: string;
  filename: string;
  mode: IngestionMode;
  status: IngestionStatus;
  startedAt: string;
  completedAt?: string;
  steps: IngestionStep[];
  logs: LogEntry[];
}

export interface IngestionStep {
  id: string;
  label: string;
  status: "complete" | "active" | "pending" | "error";
  duration?: string;
  count?: number;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export const DATASETS: Dataset[] = [
  {
    id: "ds-001",
    name: "Product Documentation v2",
    description: "Full technical documentation for the core platform APIs and SDKs",
    owner: "alex.kim@acme.com",
    visibility: "team",
    documents: 142,
    chunks: 8_430,
    createdAt: "2024-11-12",
    tags: ["docs", "api", "sdk"],
    status: "active",
    embeddingModel: "text-embedding-3-large",
  },
  {
    id: "ds-002",
    name: "Legal Contracts 2024",
    description: "Signed agreements, NDAs, and vendor contracts for the fiscal year",
    owner: "jane.doe@acme.com",
    visibility: "private",
    documents: 67,
    chunks: 3_150,
    createdAt: "2024-12-01",
    tags: ["legal", "contracts", "confidential"],
    status: "active",
    embeddingModel: "text-embedding-3-small",
  },
  {
    id: "ds-003",
    name: "Support Ticket Archive",
    description: "Historical customer support conversations and resolutions",
    owner: "ops@acme.com",
    visibility: "team",
    documents: 2_340,
    chunks: 41_200,
    createdAt: "2025-01-08",
    tags: ["support", "customers", "tickets"],
    status: "indexing",
    embeddingModel: "text-embedding-3-large",
  },
  {
    id: "ds-004",
    name: "Research Papers Q1 2025",
    description: "Internal and external research papers for ML infrastructure team",
    owner: "research@acme.com",
    visibility: "team",
    documents: 89,
    chunks: 12_670,
    createdAt: "2025-02-14",
    tags: ["research", "ml", "papers"],
    status: "active",
    embeddingModel: "text-embedding-3-large",
  },
  {
    id: "ds-005",
    name: "Marketing Assets",
    description: "Brand guidelines, campaign copy, and product one-pagers",
    owner: "marketing@acme.com",
    visibility: "public",
    documents: 34,
    chunks: 1_890,
    createdAt: "2025-03-01",
    tags: ["marketing", "brand", "copy"],
    status: "draft",
    embeddingModel: "text-embedding-3-small",
  },
  {
    id: "ds-006",
    name: "Compliance Documents",
    description: "SOC2, ISO 27001, and regulatory compliance documentation",
    owner: "security@acme.com",
    visibility: "private",
    documents: 28,
    chunks: 4_200,
    createdAt: "2025-03-15",
    tags: ["compliance", "security", "regulatory"],
    status: "error",
    embeddingModel: "text-embedding-3-large",
  },
];

export const DOCUMENTS: Document[] = [
  {
    id: "doc-001",
    datasetId: "ds-001",
    filename: "api-reference-v2.4.pdf",
    fileType: "PDF",
    fileSize: "4.2 MB",
    pages: 187,
    chunks: 892,
    status: "complete",
    mode: "guided",
    uploadedAt: "2025-03-10 14:32",
    uploadedBy: "alex.kim@acme.com",
  },
  {
    id: "doc-002",
    datasetId: "ds-001",
    filename: "sdk-getting-started.md",
    fileType: "Markdown",
    fileSize: "128 KB",
    pages: 1,
    chunks: 47,
    status: "complete",
    mode: "auto",
    uploadedAt: "2025-03-11 09:15",
    uploadedBy: "alex.kim@acme.com",
  },
  {
    id: "doc-003",
    datasetId: "ds-002",
    filename: "vendor-nda-acme-2024.pdf",
    fileType: "PDF",
    fileSize: "892 KB",
    pages: 22,
    chunks: 134,
    status: "complete",
    mode: "guided",
    uploadedAt: "2025-01-14 11:00",
    uploadedBy: "jane.doe@acme.com",
  },
  {
    id: "doc-004",
    datasetId: "ds-004",
    filename: "attention-is-all-you-need.pdf",
    fileType: "PDF",
    fileSize: "1.1 MB",
    pages: 15,
    chunks: 210,
    status: "embedding",
    mode: "auto",
    uploadedAt: "2025-03-20 16:44",
    uploadedBy: "research@acme.com",
  },
];

export const CHUNKS: Chunk[] = [
  {
    id: "chk-001",
    documentId: "doc-001",
    index: 1,
    contentType: "text",
    sourcePage: 3,
    sectionTitle: "Authentication Overview",
    tokenCount: 312,
    preview: "The API uses Bearer token authentication. All requests must include a valid JWT in the Authorization header...",
    embedText: "Authentication Overview: The API uses Bearer token authentication. Requests require a valid JWT in the Authorization header with format 'Bearer <token>'...",
    embeddingMode: "normalized",
    language: "en",
    tags: ["auth", "jwt", "api"],
    score: 0.94,
  },
  {
    id: "chk-002",
    documentId: "doc-001",
    index: 2,
    contentType: "table",
    sourcePage: 7,
    sectionTitle: "Rate Limits Table",
    tokenCount: 189,
    preview: "Endpoint | Limit | Window | Status\n/api/v2/query | 100 req | 1 min | Active\n/api/v2/upload | 10 req | 1 min | Active...",
    embedText: "Rate limits for API endpoints: /api/v2/query allows 100 requests per minute. /api/v2/upload allows 10 requests per minute...",
    embeddingMode: "normalized",
    language: "en",
    tags: ["rate-limits", "api", "table"],
    score: 0.87,
  },
  {
    id: "chk-003",
    documentId: "doc-001",
    index: 3,
    contentType: "ocr",
    sourcePage: 14,
    sectionTitle: "Architecture Diagram",
    tokenCount: 245,
    preview: "[OCR] Load Balancer → API Gateway → Processing Cluster → Vector Store. Arrows show request flow...",
    embedText: "System architecture: Load Balancer routes traffic to API Gateway which forwards to Processing Cluster and Vector Store for retrieval...",
    embeddingMode: "summary",
    language: "en",
    tags: ["architecture", "diagram", "ocr"],
    score: 0.72,
  },
  {
    id: "chk-004",
    documentId: "doc-001",
    index: 4,
    contentType: "mixed",
    sourcePage: 22,
    sectionTitle: "SDK Installation",
    tokenCount: 401,
    preview: "Install the SDK using npm or pip. The SDK supports Python 3.9+ and Node.js 18+. See the quickstart guide...",
    embedText: "SDK Installation Guide: Install using 'npm install @acme/sdk' or 'pip install acme-sdk'. Requires Python 3.9+ or Node.js 18+...",
    embeddingMode: "raw",
    language: "en",
    tags: ["sdk", "installation", "quickstart"],
    score: 0.91,
  },
];

export const INGESTION_STEPS: IngestionStep[] = [
  { id: "s1", label: "Load & Detect", status: "complete", duration: "0.3s" },
  { id: "s2", label: "Extract Content", status: "complete", duration: "4.2s", count: 187 },
  { id: "s3", label: "Normalize & Clean", status: "complete", duration: "1.1s" },
  { id: "s4", label: "Chunking", status: "active", count: 231 },
  { id: "s5", label: "Build Embed Text", status: "pending" },
  { id: "s6", label: "Build Metadata", status: "pending" },
  { id: "s7", label: "Embedding", status: "pending" },
  { id: "s8", label: "Index to Vector DB", status: "pending" },
];

export const LOGS: LogEntry[] = [
  { timestamp: "14:32:01", level: "info", message: "Ingestion started for api-reference-v2.4.pdf" },
  { timestamp: "14:32:01", level: "info", message: "File type detected: PDF (187 pages)" },
  { timestamp: "14:32:02", level: "info", message: "Content extraction started" },
  { timestamp: "14:32:06", level: "info", message: "Extracted 187 pages, 3 tables, 12 images" },
  { timestamp: "14:32:06", level: "info", message: "OCR enabled for 4 scanned pages" },
  { timestamp: "14:32:07", level: "info", message: "Normalization applied: whitespace, unicode, encoding fixes" },
  { timestamp: "14:32:08", level: "info", message: "Chunking started with size=512, overlap=64" },
  { timestamp: "14:32:08", level: "info", message: "Generated 231 chunks so far..." },
  { timestamp: "14:32:09", level: "warn", message: "Page 14 contains low-quality OCR text, confidence 62%" },
];

export const ACTIVITY_LOGS = [
  { id: "act-001", dataset: "Product Documentation v2", document: "api-reference-v2.4.pdf", mode: "guided" as IngestionMode, status: "complete" as IngestionStatus, startedAt: "2025-03-27 14:32", duration: "3m 14s" },
  { id: "act-002", dataset: "Research Papers Q1", document: "attention-is-all-you-need.pdf", mode: "auto" as IngestionMode, status: "embedding" as IngestionStatus, startedAt: "2025-03-27 13:00", duration: "—" },
  { id: "act-003", dataset: "Legal Contracts 2024", document: "vendor-nda-acme-2024.pdf", mode: "guided" as IngestionMode, status: "complete" as IngestionStatus, startedAt: "2025-03-26 11:00", duration: "8m 42s" },
  { id: "act-004", dataset: "Support Ticket Archive", document: "tickets-batch-2024-q4.jsonl", mode: "auto" as IngestionMode, status: "failed" as IngestionStatus, startedAt: "2025-03-25 09:15", duration: "1m 03s" },
  { id: "act-005", dataset: "Marketing Assets", document: "brand-guidelines-2025.pdf", mode: "auto" as IngestionMode, status: "complete" as IngestionStatus, startedAt: "2025-03-24 16:00", duration: "1m 28s" },
  { id: "act-006", dataset: "Compliance Documents", document: "soc2-type2-report.pdf", mode: "guided" as IngestionMode, status: "failed" as IngestionStatus, startedAt: "2025-03-23 10:30", duration: "0m 45s" },
];
