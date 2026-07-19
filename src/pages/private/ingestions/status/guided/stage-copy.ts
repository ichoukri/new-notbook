export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  partition: "Extraction",
  chunking: "Chunking",
  summarising: "Summarisation",
  graph: "Knowledge graph",
  vectorization: "Vectorisation",
};

export const STAGE_DESCRIPTIONS: Record<string, string> = {
  partition:
    "The document has been partitioned. Review the extracted structure and approve to continue with chunking.",
  chunking:
    "Chunks have been generated. Review them and approve to continue with summarisation.",
  summarising:
    "AI summaries are ready. Review the search-ready content and approve to continue with knowledge graph extraction.",
  graph:
    "Review the entities, equipment, procedures, and relationships extracted from this document. Every candidate needs a decision before the approved graph can be published.",
  vectorization:
    "Vectors are written. Approve to continue to the final metadata review.",
};
