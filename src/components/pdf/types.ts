import type { TPdfRegion } from "@/core/retrieval";

/**
 * A region the viewer should draw.
 *
 * ``tone`` lets one view show many regions at different emphasis — the chunk
 * reviewer draws every chunk's footprint muted and the selected one primary, so
 * the whole document's segmentation is visible at a glance without losing focus
 * on the chunk being edited.
 */
export type TPdfHighlight = TPdfRegion & {
  tone?: "primary" | "muted";
  /** Identifies the owning object (e.g. a chunk), for click-through. */
  ownerId?: string;
};
