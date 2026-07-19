import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  TGraphEntity,
  TGraphNeighborhood,
} from "@/core/knowledge-graph";
import { NeighborhoodPanel } from "./neighborhood-panel";

const center: TGraphEntity = {
  canonicalId: "ent_aaaaaaaaaaaaaaaaaaaaaaaa",
  name: "Mill 1",
  normalizedName: "mill 1",
  entityType: "Equipment",
  description: "Primary grinding mill",
  aliases: ["SAG Mill"],
  confidence: 0.94,
  excluded: false,
  mergedInto: null,
  curatedAt: null,
  curatedBy: null,
  supportingDocumentCount: 1,
  evidenceCount: 1,
  supportingDocumentIds: ["doc-1"],
};

const neighborhood: TGraphNeighborhood = {
  centerId: center.canonicalId,
  depth: 1,
  nodes: [
    center,
    {
      ...center,
      canonicalId: "ent_bbbbbbbbbbbbbbbbbbbbbbbb",
      name: "Bearing 1",
      normalizedName: "bearing 1",
      entityType: "Component",
    },
  ],
  edges: [
    {
      id: "edge-1",
      relationType: "PART_OF",
      sourceCanonicalId: "ent_bbbbbbbbbbbbbbbbbbbbbbbb",
      targetCanonicalId: center.canonicalId,
      description: "Bearing belongs to the mill.",
      confidence: 0.9,
      citationIds: ["citation-1"],
    },
  ],
  citations: [
    {
      id: "citation-1",
      documentId: "doc-1",
      documentName: "Grinding Manual.pdf",
      sourceRelativePaths: [
        "1-Grinding 1/Grinding Manual.pdf",
        "1-Grinding 1/Archive/Grinding Manual.pdf",
      ],
      chunkId: "chunk-4",
      chunkIndex: 4,
      pageNumber: 12,
      evidenceText: "Bearing 1 is part of Mill 1.",
      graphInputHash: "sha256:abc",
    },
  ],
  truncated: false,
};

describe("NeighborhoodPanel", () => {
  it("renders evidence-backed relations and opens a citation document", () => {
    const onOpenDocument = vi.fn();
    const onSelectEntity = vi.fn();
    const onDepthChange = vi.fn();

    render(
      <NeighborhoodPanel
        selectedEntity={center}
        neighborhood={neighborhood}
        depth={1}
        isLoading={false}
        error={null}
        onDepthChange={onDepthChange}
        onSelectEntity={onSelectEntity}
        onOpenDocument={onOpenDocument}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onMerge={vi.fn()}
        onExclude={vi.fn()}
      />,
    );

    expect(screen.getByText("Part Of")).toBeInTheDocument();
    expect(screen.getByText("Bearing 1 is part of Mill 1.")).toBeInTheDocument();
    expect(screen.getByText("Page 12")).toBeInTheDocument();
    expect(
      screen.getByText("1-Grinding 1/Grinding Manual.pdf"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("+1 alternate source location"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Open Grinding Manual.pdf" }),
    );
    expect(onOpenDocument).toHaveBeenCalledWith("doc-1");

    fireEvent.click(screen.getByRole("button", { name: "2 hops" }));
    expect(onDepthChange).toHaveBeenCalledWith(2);
  });
});
