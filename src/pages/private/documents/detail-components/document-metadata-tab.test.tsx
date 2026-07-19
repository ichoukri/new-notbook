import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mapBackendDocument, type TBackendDocument } from "@/core/ingestions";
import { DocumentMetadataTab } from "./document-metadata-tab";

const backendDocument: TBackendDocument = {
  id: "document-1",
  hash: "sha256",
  filename: "Grinding.pdf",
  file_size: 1024,
  file_type: "pdf",
  source_url: null,
  source_relative_path: "1-Grinding 1/Manuals/Grinding.pdf",
  source_relative_paths: [
    "1-Grinding 1/Manuals/Grinding.pdf",
    "1-Grinding 1/Archive/Grinding.pdf",
  ],
  user_id: "user-1",
  tanent_id: "tenant-1",
  created_at: "2026-07-19T12:00:00.000Z",
  updated_at: "2026-07-19T12:00:00.000Z",
  dataset_ids: ["dataset-1"],
  processing_status: "completed",
};

describe("DocumentMetadataTab", () => {
  it("labels the canonical and alternate source locations", () => {
    render(
      <DocumentMetadataTab
        document={mapBackendDocument(backendDocument)}
        pageCount={10}
        chunkCount={20}
        metrics={null}
      />,
    );

    const locations = screen.getByLabelText("Source locations");
    expect(within(locations).getByText("Canonical")).toBeInTheDocument();
    expect(within(locations).getByText("Alternate 1")).toBeInTheDocument();
    expect(
      within(locations).getByText("1-Grinding 1/Manuals/Grinding.pdf"),
    ).toBeInTheDocument();
    expect(
      within(locations).getByText("1-Grinding 1/Archive/Grinding.pdf"),
    ).toBeInTheDocument();
  });
});
