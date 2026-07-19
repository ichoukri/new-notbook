import { describe, expect, it } from "vitest";
import { getGroundedAnswerStatusMessage } from "./grounded-answer-utils";

describe("grounded answer status", () => {
  it("explains every fail-closed abstention outcome", () => {
    expect(getGroundedAnswerStatusMessage("no_evidence")).toContain(
      "No accessible evidence",
    );
    expect(getGroundedAnswerStatusMessage("insufficient_context")).toContain(
      "not sufficient",
    );
    expect(getGroundedAnswerStatusMessage("invalid_grounding")).toContain(
      "valid evidence citations",
    );
    expect(getGroundedAnswerStatusMessage("generation_failed")).toContain(
      "unavailable",
    );
  });
});
