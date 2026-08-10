import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TDataset } from "@/core/datasets";
import { EditDatasetForm } from "./edit-dataset-dialog";

function dataset(
  updatedAt: string,
  metadata: Record<string, unknown>,
): TDataset {
  return {
    id: "dataset-1",
    name: "Maintenance corpus",
    description: "Current procedures",
    tenantId: "tenant-1",
    createdBy: "user-1",
    status: "active",
    createdAt: "2026-08-10T09:00:00Z",
    updatedAt,
    tags: ["maintenance"],
    metadata,
    documents: [],
    documentCount: 0,
  };
}

describe("EditDatasetForm", () => {
  it("retains its opening concurrency token and metadata baseline", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const openingDataset = dataset("2026-08-10T10:00:00Z", {
      agent_profile: "generic",
      versions: [{ event: "document_added" }],
      owner: "old-team",
    });
    const refreshedDataset = dataset("2026-08-10T10:01:00Z", {
      agent_profile: "generic",
      versions: [{ event: "document_added" }, { event: "ingestion_updated" }],
      owner: "new-team",
    });
    const props = {
      onCancel: vi.fn(),
      onSave,
      onSaved: vi.fn(),
      onSubmittingChange: vi.fn(),
    };

    const { rerender } = render(
      <EditDatasetForm dataset={openingDataset} {...props} />,
    );
    rerender(<EditDatasetForm dataset={refreshedDataset} {...props} />);

    fireEvent.change(
      screen.getByPlaceholderText("e.g. Product Documentation v3"),
      { target: { value: "Locally renamed corpus" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      expected_updated_at: "2026-08-10T10:00:00Z",
      name: "Locally renamed corpus",
      description: "Current procedures",
      status: "active",
      tags: ["maintenance"],
      agent_profile: "generic",
    });
  });
});
