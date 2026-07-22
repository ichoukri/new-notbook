import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TIngestionChunk } from "@/core/ingestions";
import { ChunkReview } from "./chunk-review";

// The viewer needs a real PDF engine and a canvas; neither exists in jsdom, so
// it is stubbed. These tests are about the wiring around it: which highlights
// are produced, with what emphasis, and whether selection flows both ways.
const viewerProps = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/components/pdf/pdf-viewer", () => ({
  PdfViewer: (props: unknown) => {
    viewerProps.current = props;
    return <div data-testid="pdf-viewer" />;
  },
}));

vi.mock("@/core/api", () => ({
  backendApi: {
    get: vi.fn(async () => ({ url: "blob:pdf", filename: "doc.pdf" })),
  },
}));

function chunk(
  id: string,
  index: number,
  regions: Array<Record<string, number>> | null,
): TIngestionChunk {
  return {
    id,
    documentId: "doc-1",
    chunkIndex: index,
    chunkVersion: 1,
    pageNumber: 1,
    textContent: `Chunk ${index} body text\n\nChunk ${index} second paragraph`,
    summaryContent: null,
    charCount: 20,
    contentTypes: ["text"],
    originalContent: {
      text: `Chunk ${index} body text\n\nChunk ${index} second paragraph`,
    },
    chunkMetadata: regions ? { regions } : null,
    ingestionStatus: "stored",
    isActive: true,
    createdAt: "2026-07-21T10:00:00.000Z",
    updatedAt: "2026-07-21T10:00:00.000Z",
  } as TIngestionChunk;
}

function box(left: number, page = 1) {
  return { page, l: left, t: 0.1, r: left + 0.2, b: 0.2 };
}

function renderReview(chunks: TIngestionChunk[], canPreview = true) {
  return render(
    <ChunkReview
      chunks={chunks}
      isLoading={false}
      stage="chunking"
      documentId="doc-1"
      canPreviewSource={canPreview}
      onSubmitEdits={vi.fn()}
      isSubmitting={false}
      disabled={false}
    />,
  );
}

describe("chunk review source pane", () => {
  beforeEach(() => {
    viewerProps.current = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("is hidden until asked for", () => {
    renderReview([chunk("c1", 0, [box(0.1)])]);

    expect(screen.queryByTestId("pdf-viewer")).toBeNull();
    expect(
      screen.getByRole("button", { name: /show source/i }),
    ).toBeInTheDocument();
  });

  it("offers no toggle when the source is not a PDF", () => {
    renderReview([chunk("c1", 0, [box(0.1)])], false);

    expect(screen.queryByRole("button", { name: /show source/i })).toBeNull();
  });

  it("draws every chunk muted so the whole segmentation is visible", async () => {
    renderReview([
      chunk("c1", 0, [box(0.1)]),
      chunk("c2", 1, [box(0.5)]),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /show source/i }));
    await waitFor(() => expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument());

    const props = viewerProps.current as { highlights: Array<Record<string, unknown>> };
    expect(props.highlights).toHaveLength(2);
    expect(props.highlights.every((h) => h.tone === "muted")).toBe(true);
    expect(props.highlights.map((h) => h.ownerId)).toEqual(["c1", "c2"]);
  });

  it("emphasises the focused chunk and leaves the rest muted", async () => {
    renderReview([
      chunk("c1", 0, [box(0.1)]),
      chunk("c2", 1, [box(0.5)]),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /show source/i }));
    await waitFor(() => expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Chunk 1 body text/));

    await waitFor(() => {
      const props = viewerProps.current as {
        highlights: Array<Record<string, unknown>>;
        targetPage: number | null;
      };
      const primary = props.highlights.filter((h) => h.tone === "primary");
      expect(primary).toHaveLength(1);
      expect(primary[0].ownerId).toBe("c2");
      // Drawn last so it sits above the muted boxes.
      expect(props.highlights.at(-1)?.tone).toBe("primary");
      expect(props.targetPage).toBe(1);
    });
  });

  it("reflects a staged split instead of showing pre-edit server state", async () => {
    // The pane used to read raw server chunks while the list read the staged
    // preview, so edits were invisible here by construction.
    renderReview([chunk("c1", 0, [box(0.1)]), chunk("c2", 1, [box(0.5)])]);

    fireEvent.click(screen.getByRole("button", { name: /show source/i }));
    await waitFor(() =>
      expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument(),
    );

    const before = viewerProps.current as {
      highlights: Array<Record<string, unknown>>;
    };
    expect(before.highlights.map((h) => h.ownerId)).toEqual(["c1", "c2"]);

    // Stage a split of the first chunk into two segments.
    fireEvent.click(screen.getAllByTitle(/split/i)[0]);
    const splitPoints = await screen.findAllByText(/split here/i);
    fireEvent.click(splitPoints[0]);
    fireEvent.click(screen.getByRole("button", { name: /split into/i }));

    await waitFor(() => {
      const after = viewerProps.current as {
        highlights: Array<Record<string, unknown>>;
      };
      // The split rows replace c1, so its owner key is gone and the new
      // segments own boxes instead.
      const owners = after.highlights.map((h) => h.ownerId);
      expect(owners).not.toContain("c1");
      expect(owners.some((o) => String(o).startsWith("split:c1:"))).toBe(true);
      // Staged geometry is approximate until applied.
      expect(
        after.highlights
          .filter((h) => String(h.ownerId).startsWith("split:"))
          .every((h) => h.stale === true),
      ).toBe(true);
    });

    expect(screen.getByText(/exact positions are recalculated/i)).toBeInTheDocument();
  });

  it("stops drawing a chunk staged for deletion", async () => {
    renderReview([chunk("c1", 0, [box(0.1)]), chunk("c2", 1, [box(0.5)])]);

    fireEvent.click(screen.getByRole("button", { name: /show source/i }));
    await waitFor(() =>
      expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByTitle(/delete/i)[0]);

    await waitFor(() => {
      const props = viewerProps.current as {
        highlights: Array<Record<string, unknown>>;
      };
      expect(props.highlights.map((h) => h.ownerId)).toEqual(["c2"]);
    });
  });

  it("warns when no chunk carries coordinates instead of showing a bare PDF", async () => {
    renderReview([chunk("c1", 0, null)]);

    fireEvent.click(screen.getByRole("button", { name: /show source/i }));

    await waitFor(() =>
      expect(screen.getByText(/no source coordinates/i)).toBeInTheDocument(),
    );
  });
});
