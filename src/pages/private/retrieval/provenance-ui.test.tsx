import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  TGroundedAnswerResponse,
  TRetrievalSearchHit,
} from "@/core/retrieval";
import { GroundedAnswerCard } from "./grounded-answer";
import { ResultCard } from "./result-components";

afterEach(cleanup);

const hit: TRetrievalSearchHit = {
  chunkId: "chunk-1",
  documentId: "doc-1",
  documentFilename: "Grinding.pdf",
  documentFileType: "pdf",
  datasetIds: ["dataset-1"],
  pageNumber: 12,
  chunkIndex: 3,
  tokenCount: 25,
  contentTypes: ["text"],
  score: 0.91,
  excerpt: "Apply lubricant at the designated point.",
  textContent: "Apply lubricant at the designated point.",
  embedText: "Apply lubricant at the designated point.",
  embeddingMode: "raw",
  sourceRelativePaths: [
    "1-Grinding 1/Manuals/Grinding.pdf",
    "1-Grinding 1/Archive/Grinding.pdf",
  ],
};

describe("retrieval provenance UI", () => {
  it("shows canonical and alternate locations on retrieval hits", () => {
    const onClick = vi.fn();
    render(
      <ResultCard
        result={hit}
        rank={1}
        query="lubricant"
        selected={false}
        datasetNamesById={new Map([["dataset-1", "Grinding"]])}
        onClick={onClick}
        onOpenDocument={vi.fn()}
      />,
    );

    expect(
      screen.getByText("1-Grinding 1/Manuals/Grinding.pdf"),
    ).toBeInTheDocument();
    const alternateSummary = screen.getByText(
      "+1 alternate source location",
    );
    fireEvent.click(alternateSummary);
    expect(
      screen.getByText("1-Grinding 1/Archive/Grinding.pdf"),
    ).toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows provenance on grounded evidence citations", () => {
    const answer: TGroundedAnswerResponse = {
      query: "How is the bearing lubricated?",
      answer: "Use the approved procedure. [1]",
      abstained: false,
      abstentionReason: null,
      citationIndices: [1],
      citations: [
        {
          number: 1,
          chunkId: "chunk-1",
          documentId: "doc-1",
          documentFilename: "Grinding.pdf",
          pageNumber: 12,
          excerpt: "Apply lubricant at the designated point.",
          sourceRelativePaths: hit.sourceRelativePaths,
          regions: [],
        },
      ],
      hits: [hit],
      retrievalDebug: null,
    };

    render(
      <GroundedAnswerCard
        answer={answer}
        onSelectEvidence={vi.fn()}
        onOpenDocument={vi.fn()}
      />,
    );

    expect(
      screen.getByText("1-Grinding 1/Manuals/Grinding.pdf"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("+1 alternate source location"),
    ).toBeInTheDocument();
  });
});
