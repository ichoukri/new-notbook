import type { TRetrievalAbstentionReason } from "@/core/retrieval";

const ABSTENTION_LABELS: Record<TRetrievalAbstentionReason, string> = {
  no_evidence: "No accessible evidence matched this question.",
  insufficient_context:
    "The retrieved evidence was not sufficient to support an answer.",
  invalid_grounding:
    "The generated response could not be tied to valid evidence citations.",
  generation_failed: "Answer generation was unavailable. Try again later.",
};

export function getGroundedAnswerStatusMessage(
  reason: TRetrievalAbstentionReason | null,
): string {
  return reason
    ? ABSTENTION_LABELS[reason]
    : "The system abstained because it could not verify the answer.";
}
