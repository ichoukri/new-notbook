import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
  indexing: "bg-blue-50 text-blue-700 border-blue-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  error: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  uploading: "bg-indigo-50 text-indigo-700 border-indigo-200",
  queued: "bg-gray-100 text-gray-600 border-gray-200",
  extracting: "bg-amber-50 text-amber-700 border-amber-200",
  partitioning: "bg-amber-50 text-amber-700 border-amber-200",
  cleaned: "bg-sky-50 text-sky-700 border-sky-200",
  chunked: "bg-violet-50 text-violet-700 border-violet-200",
  chunking: "bg-violet-50 text-violet-700 border-violet-200",
  summarising: "bg-sky-50 text-sky-700 border-sky-200",
  embedding: "bg-blue-50 text-blue-700 border-blue-200",
  vectorization: "bg-blue-50 text-blue-700 border-blue-200",
  indexed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const CONTENT_TYPE_STYLES: Record<string, string> = {
  text: "bg-gray-100 text-gray-700",
  table: "bg-blue-50 text-blue-700",
  ocr: "bg-amber-50 text-amber-700",
  image: "bg-violet-50 text-violet-700",
  mixed: "bg-teal-50 text-teal-700",
  transcript: "bg-pink-50 text-pink-700",
};

function formatStatusLabel(status: string): string {
  return status
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 border-gray-200",
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function ContentTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide",
        CONTENT_TYPE_STYLES[type] ?? "bg-gray-100 text-gray-700",
      )}
    >
      {type}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: "auto" | "guided" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        mode === "auto"
          ? "bg-indigo-50 text-indigo-700"
          : "bg-violet-50 text-violet-700"
      )}
    >
      {mode === "auto" ? "Auto" : "Guided"}
    </span>
  );
}

export function VisibilityBadge({ visibility }: { visibility: "public" | "private" | "team" }) {
  const styles = {
    public: "bg-emerald-50 text-emerald-700",
    private: "bg-red-50 text-red-700",
    team: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", styles[visibility])}>
      {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
    </span>
  );
}
