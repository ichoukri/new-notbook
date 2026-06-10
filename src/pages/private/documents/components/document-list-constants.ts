export const FILE_TYPE_STYLES: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  PDF: { bg: "bg-red-50", text: "text-red-600", icon: "PDF" },
  DOCX: { bg: "bg-blue-50", text: "text-blue-600", icon: "DOC" },
  XLSX: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "XLS" },
  CSV: { bg: "bg-teal-50", text: "text-teal-600", icon: "CSV" },
  MD: { bg: "bg-gray-100", text: "text-gray-600", icon: "MD" },
  TXT: { bg: "bg-gray-100", text: "text-gray-500", icon: "TXT" },
  JSON: { bg: "bg-violet-50", text: "text-violet-600", icon: "JSON" },
  JSONL: { bg: "bg-violet-50", text: "text-violet-600", icon: "JSONL" },
  HTML: { bg: "bg-orange-50", text: "text-orange-600", icon: "HTML" },
  PPTX: { bg: "bg-amber-50", text: "text-amber-600", icon: "PPT" },
};

export const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "queued", label: "Queued" },
  { value: "partitioning", label: "Extracting" },
  { value: "chunking", label: "Chunking" },
  { value: "summarising", label: "Summarising" },
  { value: "vectorization", label: "Embedding" },
  { value: "partitioning_awaiting_approval", label: "Awaiting Extract Review" },
  { value: "chunking_awaiting_approval", label: "Awaiting Chunk Review" },
  { value: "summarising_awaiting_approval", label: "Awaiting Summary Review" },
  { value: "vectorization_awaiting_approval", label: "Awaiting Vector Review" },
  { value: "metadata_awaiting_approval", label: "Awaiting Metadata Review" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;
