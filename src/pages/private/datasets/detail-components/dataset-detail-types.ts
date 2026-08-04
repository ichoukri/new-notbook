import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldQuestion,
} from "lucide-react";

/**
 * Ingestion statuses are fine-grained (partitioning, chunking, vectorization…).
 * The detail page groups them into the five outcomes a dataset owner acts on.
 */
export type DatasetDocumentGroup =
  | "completed"
  | "processing"
  | "awaiting"
  | "pending"
  | "failed";

export type DatasetDocumentFilter = "all" | DatasetDocumentGroup;

export type DatasetDocumentSortKey = "name" | "size" | "status" | "added";

export type SortDirection = "asc" | "desc";

export type DatasetDocumentSort = {
  key: DatasetDocumentSortKey;
  direction: SortDirection;
};

export const DEFAULT_DOCUMENT_SORT: DatasetDocumentSort = {
  key: "added",
  direction: "desc",
};

export const DOCUMENT_GROUP_ORDER: DatasetDocumentGroup[] = [
  "completed",
  "processing",
  "awaiting",
  "pending",
  "failed",
];

export const DOCUMENT_GROUP_CONFIG = {
  completed: {
    label: "Indexed",
    icon: CheckCircle2,
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeChip: "bg-emerald-600 text-white border-emerald-600",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    bar: "bg-blue-500",
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    activeChip: "bg-blue-600 text-white border-blue-600",
  },
  awaiting: {
    label: "Needs approval",
    icon: ShieldQuestion,
    bar: "bg-violet-500",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    activeChip: "bg-violet-600 text-white border-violet-600",
  },
  pending: {
    label: "Queued",
    icon: Clock3,
    bar: "bg-gray-300",
    dot: "bg-gray-400",
    chip: "bg-gray-100 text-gray-600 border-gray-200",
    activeChip: "bg-gray-700 text-white border-gray-700",
  },
  failed: {
    label: "Failed",
    icon: AlertTriangle,
    bar: "bg-red-500",
    dot: "bg-red-500",
    chip: "bg-red-50 text-red-700 border-red-200",
    activeChip: "bg-red-600 text-white border-red-600",
  },
} as const satisfies Record<
  DatasetDocumentGroup,
  {
    label: string;
    icon: typeof CheckCircle2;
    bar: string;
    dot: string;
    chip: string;
    activeChip: string;
  }
>;

export type UpdateDatasetPayload = {
  name: string;
  description?: string | null;
  status: "active" | "archived";
  tags?: string[] | null;
  dataset_metadata?: Record<string, unknown> | null;
};
