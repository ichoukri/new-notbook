import {
  Activity,
  DatabaseZap,
  FileScan,
  HardDrive,
  Network,
  Search,
  type LucideIcon,
} from "lucide-react";

export type ProjectSettingsSectionId =
  | "ingestion"
  | "retrieval"
  | "graph"
  | "storage"
  | "maintenance";

export type RuntimeField = {
  name: string;
  label: string;
  description: string;
  kind: "boolean" | "number" | "text" | "select";
  group: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
};

export type ProjectSettingsSection = {
  id: ProjectSettingsSectionId;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  fields: RuntimeField[];
};

const PROVIDER_OPTIONS = [
  { value: "ollama", label: "Ollama" },
  { value: "openai", label: "OpenAI" },
  { value: "vllm", label: "vLLM" },
];

export const PROJECT_SETTINGS_SECTIONS: ProjectSettingsSection[] = [
  {
    id: "ingestion",
    title: "Ingestion & parsing",
    shortTitle: "Ingestion",
    description:
      "Control document routing, OCR quality, PDF fallback behavior, and summarization throughput.",
    icon: FileScan,
    accent: "bg-blue-50 text-blue-700",
    fields: [
      {
        name: "partition_engine",
        label: "Rich-document engine",
        description:
          "Docling handles layout, tables and OCR. Unstructured uses the legacy handlers.",
        kind: "select",
        group: "Pipeline",
        options: [
          { value: "docling", label: "Docling" },
          { value: "unstructured", label: "Unstructured" },
        ],
      },
      {
        name: "summary_batch_size",
        label: "Summary concurrency",
        description:
          "Table or image chunks summarized concurrently per worker. Raise carefully against provider and GPU limits.",
        kind: "number",
        group: "Pipeline",
        min: 1,
        suffix: "chunks / worker",
      },
      {
        name: "docling_accelerator_device",
        label: "Docling accelerator",
        description:
          "Auto uses a visible GPU and falls back to CPU. CUDA fails loudly when no CUDA device is available.",
        kind: "select",
        group: "Docling OCR",
        options: [
          { value: "auto", label: "Auto" },
          { value: "cpu", label: "CPU" },
          { value: "cuda", label: "CUDA" },
          { value: "mps", label: "Apple MPS" },
        ],
      },
      {
        name: "docling_force_ocr",
        label: "Force full-page OCR",
        description:
          "Rasterize and OCR every page, even when a text layer exists. This is significantly slower.",
        kind: "boolean",
        group: "Docling OCR",
      },
      {
        name: "docling_auto_ocr_fallback",
        label: "Automatic OCR fallback",
        description:
          "Re-run PDFs whose extracted text appears corrupted by a broken font map.",
        kind: "boolean",
        group: "Docling OCR",
      },
      {
        name: "docling_images_scale",
        label: "Normal render scale",
        description: "Page and picture render scale for the normal Docling pass.",
        kind: "number",
        group: "Docling OCR",
        min: 1,
        max: 8,
        step: 0.5,
      },
      {
        name: "docling_ocr_images_scale",
        label: "OCR render scale",
        description:
          "Resolution used for full-page OCR. Higher values improve small text but consume more memory.",
        kind: "number",
        group: "Docling OCR",
        min: 1,
        max: 8,
        step: 0.5,
      },
      {
        name: "docling_ocr_min_wordlike_ratio",
        label: "Minimum word-like ratio",
        description:
          "Trigger OCR when too few alphabetic words look linguistically valid.",
        kind: "number",
        group: "OCR detection",
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: "docling_ocr_max_digit_in_word_ratio",
        label: "Maximum mixed-digit ratio",
        description:
          "Trigger OCR when too many words contain glyph-to-digit corruption.",
        kind: "number",
        group: "OCR detection",
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: "pdf_partition_strategy",
        label: "Unstructured PDF strategy",
        description:
          "Auto tries fast text extraction before falling back to high-resolution parsing.",
        kind: "select",
        group: "PDF fallback",
        options: [
          { value: "auto", label: "Automatic" },
          { value: "fast", label: "Fast only" },
          { value: "hi_res", label: "High resolution only" },
        ],
      },
      {
        name: "pdf_fast_path_min_text_chars",
        label: "Fast-path text threshold",
        description: "Minimum extracted characters needed to accept the fast result.",
        kind: "number",
        group: "PDF fallback",
        min: 0,
        suffix: "characters",
      },
      {
        name: "pdf_fast_path_min_text_elements",
        label: "Fast-path element threshold",
        description: "Minimum non-empty elements needed to accept the fast result.",
        kind: "number",
        group: "PDF fallback",
        min: 0,
        suffix: "elements",
      },
    ],
  },
  {
    id: "retrieval",
    title: "Retrieval & answers",
    shortTitle: "Retrieval",
    description:
      "Choose the defaults users start with in Retrieval Test. Every search can still override them.",
    icon: Search,
    accent: "bg-violet-50 text-violet-700",
    fields: [
      {
        name: "retrieval_default_search_mode",
        label: "Default search mode",
        description: "The retrieval strategy selected when the workbench opens.",
        kind: "select",
        group: "Search defaults",
        options: [
          { value: "semantic", label: "Semantic" },
          { value: "hybrid", label: "Hybrid" },
          { value: "keyword", label: "Keyword" },
          { value: "graph_mix", label: "Graph Mix" },
        ],
      },
      {
        name: "retrieval_default_query_expansion",
        label: "Query expansion",
        description: "Generate alternate queries before retrieval or keep the original query only.",
        kind: "select",
        group: "Search defaults",
        options: [
          { value: "none", label: "None" },
          { value: "multi_query", label: "Multi-query" },
        ],
      },
      {
        name: "retrieval_default_top_k",
        label: "Results returned",
        description: "Initial number of ranked results shown to the user.",
        kind: "number",
        group: "Search defaults",
        min: 1,
        max: 20,
        suffix: "results",
      },
      {
        name: "retrieval_default_candidate_k",
        label: "Candidate pool",
        description: "Set to 0 to let the backend choose its candidate pool automatically.",
        kind: "number",
        group: "Search defaults",
        min: 0,
        max: 200,
        suffix: "0 = automatic",
      },
      {
        name: "retrieval_default_debug_enabled",
        label: "Open with diagnostics",
        description: "Request and display retrieval scoring diagnostics by default.",
        kind: "boolean",
        group: "Diagnostics",
      },
    ],
  },
  {
    id: "graph",
    title: "Knowledge graph",
    shortTitle: "Knowledge graph",
    description:
      "Configure entity and relation extraction before candidates enter guided review.",
    icon: Network,
    accent: "bg-fuchsia-50 text-fuchsia-700",
    fields: [
      {
        name: "graph_extraction_provider",
        label: "Extraction provider",
        description: "The enabled AI provider used to mine graph candidates.",
        kind: "select",
        group: "Extraction model",
        options: PROVIDER_OPTIONS,
      },
      {
        name: "graph_extraction_model",
        label: "Extraction model",
        description: "Use a model with reliable structured-output support.",
        kind: "text",
        group: "Extraction model",
      },
      {
        name: "graph_extraction_min_confidence",
        label: "Minimum confidence",
        description: "Discard model candidates below this score before guided review.",
        kind: "number",
        group: "Safety limits",
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: "graph_extraction_max_chunks_per_document",
        label: "Maximum chunks per document",
        description: "Stop extraction when one document exceeds this safety bound.",
        kind: "number",
        group: "Safety limits",
        min: 1,
        max: 100000,
        suffix: "chunks",
      },
    ],
  },
  {
    id: "storage",
    title: "Storage & uploads",
    shortTitle: "Storage",
    description:
      "Set upload policy and signed-URL lifetime. Storage connections remain environment-managed.",
    icon: HardDrive,
    accent: "bg-emerald-50 text-emerald-700",
    fields: [
      {
        name: "max_file_size_upload",
        label: "Maximum upload size",
        description: "Reject larger direct uploads before issuing a storage URL.",
        kind: "number",
        group: "Upload policy",
        min: 1,
        max: 102400,
        suffix: "MB",
      },
      {
        name: "s3_presigned_upload_expiration_seconds",
        label: "Upload URL lifetime",
        description: "How long a prepared direct-upload URL remains usable.",
        kind: "number",
        group: "Upload policy",
        min: 60,
        max: 86400,
        suffix: "seconds",
      },
    ],
  },
  {
    id: "maintenance",
    title: "Maintenance & diagnostics",
    shortTitle: "Maintenance",
    description:
      "Tune stuck-job recovery and opt-in ingestion traces for pipeline evaluation.",
    icon: Activity,
    accent: "bg-amber-50 text-amber-700",
    fields: [
      {
        name: "ingestion_stale_pre_execution_seconds",
        label: "Queued-job recovery threshold",
        description: "After this delay, a stranded pending or queued document may be revived.",
        kind: "number",
        group: "Recovery",
        min: 10,
        suffix: "seconds",
      },
      {
        name: "ingestion_trace_enabled",
        label: "Ingestion tracing",
        description: "Capture full per-stage content for offline pipeline evaluation.",
        kind: "boolean",
        group: "Ingestion traces",
      },
      {
        name: "ingestion_trace_to_storage",
        label: "Write traces to object storage",
        description: "Store trace JSON artifacts instead of placing full content in logs.",
        kind: "boolean",
        group: "Ingestion traces",
      },
      {
        name: "ingestion_trace_include_images",
        label: "Include image bytes",
        description: "Embed base64 images in traces. This can create very large artifacts.",
        kind: "boolean",
        group: "Ingestion traces",
      },
      {
        name: "ingestion_trace_max_text_chars",
        label: "Trace text limit",
        description: "Maximum characters per traced text field. Set to 0 for no truncation.",
        kind: "number",
        group: "Ingestion traces",
        min: 0,
        suffix: "0 = unlimited",
      },
    ],
  },
];

export const SYSTEM_SECTION_ICON = DatabaseZap;
