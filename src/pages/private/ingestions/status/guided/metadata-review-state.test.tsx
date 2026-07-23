import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { TIngestionDocument } from "@/core/ingestions";
import { MetadataReviewState } from "./metadata-review-state";

function documentAtMetadataReview(): TIngestionDocument {
  return {
    id: "doc-1",
    hash: "hash",
    filename: "doc.pdf",
    fileSize: 1,
    fileType: "pdf",
    sourceRelativePaths: [],
    userId: "user-1",
    tenantId: "tenant-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    datasetIds: [],
    processingStatus: "metadata_awaiting_approval",
    mode: "guided",
    processingDetails: null,
    docMetadata: null,
    accessPolicy: null,
  };
}

function renderState(onRevert: () => void) {
  // The shell's topbar uses router navigation, so the state needs a router.
  return render(
    <MemoryRouter>
      <MetadataReviewState
        document={documentAtMetadataReview()}
        datasetName="Dataset"
        pipeline={[]}
        onSave={vi.fn()}
        onRevert={onRevert}
        onCancel={vi.fn()}
        isSaving={false}
        isReverting={false}
        isCancelling={false}
      />
    </MemoryRouter>,
  );
}

const backButton = () =>
  screen.getByRole("button", { name: /^back$/i }) as HTMLButtonElement;

describe("MetadataReviewState step back", () => {
  it("reverts through the confirm dialog when the form is pristine", () => {
    const onRevert = vi.fn();
    renderState(onRevert);

    expect(backButton().disabled).toBe(false);
    fireEvent.click(backButton());
    fireEvent.click(screen.getByRole("button", { name: /go back/i }));

    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it("blocks stepping back while metadata edits are unsaved", () => {
    // The form fields live only in local state until "Save draft"; a revert
    // unmounts the form, so unsaved edits must block the Back button — the
    // dialog's "nothing is deleted" has to stay true.
    const onRevert = vi.fn();
    renderState(onRevert);

    const title = screen.getByDisplayValue("doc.pdf");
    fireEvent.change(title, { target: { value: "A better title" } });
    expect(backButton().disabled).toBe(true);

    // Undoing the edit unblocks it again.
    fireEvent.change(title, { target: { value: "doc.pdf" } });
    expect(backButton().disabled).toBe(false);
  });

  it("ignores whitespace-only differences when deciding dirtiness", () => {
    const onRevert = vi.fn();
    renderState(onRevert);

    const title = screen.getByDisplayValue("doc.pdf");
    fireEvent.change(title, { target: { value: "  doc.pdf  " } });
    expect(backButton().disabled).toBe(false);
  });
});
