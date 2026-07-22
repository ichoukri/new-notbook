import { describe, expect, it } from "vitest";
import {
  GUIDED_GATES_PER_DOCUMENT,
  isLiveInPipeline,
  isTerminalStatus,
} from "../ingestions";

describe("review queue membership", () => {
  it("treats the backend's terminal statuses as finished", () => {
    for (const status of ["completed", "failed", "cancelled"]) {
      expect(isTerminalStatus(status)).toBe(true);
      expect(isLiveInPipeline(status)).toBe(false);
    }
  });

  it("treats freshly queued uploads as live", () => {
    for (const status of ["pending", "queued", "partitioning", "chunking"]) {
      expect(isLiveInPipeline(status)).toBe(true);
    }
  });

  it("treats a document paused at any approval gate as live", () => {
    // This is the case that used to strand documents: an in-flight duplicate
    // sitting at a gate is exactly what the review queue exists to surface.
    const gates = [
      "partitioning_awaiting_approval",
      "chunking_awaiting_approval",
      "summarising_awaiting_approval",
      "graph_extraction_awaiting_approval",
      "vectorization_awaiting_approval",
      "metadata_awaiting_approval",
    ];

    for (const status of gates) {
      expect(isLiveInPipeline(status)).toBe(true);
    }
  });

  it("counts every approval gate a guided document can hit", () => {
    // Five stage gates plus the final metadata gate. If a stage is added, this
    // must move with it — the confirmation dialog multiplies by this number.
    expect(GUIDED_GATES_PER_DOCUMENT).toBe(6);
  });
});
