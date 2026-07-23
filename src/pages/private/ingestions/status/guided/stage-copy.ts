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

// Step-back copy, keyed by the stage being reverted *from*. The review the
// user returns to, and what stepping back means for the work done since —
// nothing is deleted; unchanged stages are reused when approving forward.
export const REVERT_TARGET_LABELS: Record<string, string> = {
  chunking: STAGE_DISPLAY_NAMES.partition,
  summarising: STAGE_DISPLAY_NAMES.chunking,
  graph: STAGE_DISPLAY_NAMES.summarising,
  vectorization: STAGE_DISPLAY_NAMES.summarising,
  metadata: STAGE_DISPLAY_NAMES.vectorization,
};

export const REVERT_DESCRIPTIONS: Record<string, string> = {
  chunking:
    "Your generated chunks are kept as a saved version. If you change the extracted elements and approve again, chunks are rebuilt from the new selection.",
  summarising:
    "Summaries stay on the chunks. If you approve chunking again without edits, nothing is recomputed.",
  graph:
    "Extracted candidates and your review decisions are kept. If the chunks are unchanged when you come back, the same review is restored.",
  vectorization:
    "The written vectors are replaced when you approve forward through vectorisation again.",
  metadata:
    "Nothing is recomputed — approving the vectors brings you straight back to this metadata review.",
};
