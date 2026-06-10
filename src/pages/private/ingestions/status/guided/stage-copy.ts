export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  partition: "Extraction",
  chunking: "Chunking",
  summarising: "Summarisation",
  vectorization: "Vectorisation",
};

export const STAGE_DESCRIPTIONS: Record<string, string> = {
  partition:
    "The document has been partitioned. Review the extracted structure and approve to continue with chunking.",
  chunking:
    "Chunks have been generated. Review them and approve to continue with summarisation.",
  summarising:
    "AI summaries are ready. Review the search-ready content and approve to continue with vectorisation.",
  vectorization:
    "Vectors are written. Approve to finalize the document and make it searchable.",
};
