import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  mapBackendDataset,
  type TBackendDataset,
} from "@/core/datasets";
import {
  getDocumentChunkCount,
  getDocumentDatasetName,
  getDocumentPipelineStatusPath,
  getDocumentStatusValue,
  isDocumentActivelyProcessing,
  isDocumentAwaitingReview,
  isDocumentInPipeline,
} from "@/core/documents";
import {
  getDocumentStatusLabel,
  mapBackendDocument,
  shouldLoadIngestionChunks,
  type TBackendDocument,
} from "@/core/ingestions";

const backendDocument: TBackendDocument = {
  id: "doc-1",
  hash: "hash-1",
  filename: "policy.pdf",
  file_size: 2048,
  file_type: "pdf",
  source_url: null,
  user_id: "user-1",
  tanent_id: "tenant-1",
  created_at: "2026-01-01T10:00:00.000Z",
  updated_at: "2026-01-01T10:05:00.000Z",
  task_id: "task-1",
  dataset_ids: ["dataset-1"],
  processing_status: "vectorization",
  processing_details: {
    chunking: {
      total_chunks: 12,
    },
    vectorization: {
      vectorized_chunks: 8,
      chunk_version: 2,
    },
  },
};

const backendDataset: TBackendDataset = {
  id: "dataset-1",
  name: "Policies",
  description: null,
  tenant_id: "tenant-1",
  created_by: "user-1",
  status: "active",
  created_at: "2026-01-01T09:00:00.000Z",
  updated_at: "2026-01-01T10:05:00.000Z",
  tags: ["hr"],
  dataset_metadata: {
    owner: "ops",
  },
  documents: [
    {
      id: "doc-1",
      hash: "hash-1",
      filename: "policy.pdf",
      file_size: 2048,
      file_type: "pdf",
      source_url: null,
      user_id: "user-1",
      tanent_id: "tenant-1",
      created_at: "2026-01-01T10:00:00.000Z",
      updated_at: "2026-01-01T10:05:00.000Z",
      task_id: "task-1",
      dataset_ids: ["dataset-1"],
      processing_status: "completed",
    },
  ],
};

describe("backend mappers", () => {
  it("maps backend documents into frontend ingestion documents", () => {
    const document = mapBackendDocument(backendDocument);

    expect(document).toMatchObject({
      id: "doc-1",
      filename: "policy.pdf",
      fileSize: 2048,
      fileType: "pdf",
      tenantId: "tenant-1",
      mode: "auto",
      processingStatus: "vectorization",
      datasetIds: ["dataset-1"],
    });
    expect(getDocumentChunkCount(document)).toBe(12);
  });

  it("maps backend datasets with nested document summaries", () => {
    const dataset = mapBackendDataset(backendDataset);

    expect(dataset).toMatchObject({
      id: "dataset-1",
      name: "Policies",
      description: "",
      status: "active",
      tags: ["hr"],
      documentCount: 1,
    });
    expect(dataset.documents[0]).toMatchObject({
      id: "doc-1",
      filename: "policy.pdf",
      fileSize: 2048,
      processingStatus: "completed",
    });
  });
});

describe("formatting helpers", () => {
  it("normalizes backend statuses for display badges", () => {
    expect(getDocumentStatusValue("completed")).toBe("complete");
    expect(getDocumentStatusValue("partitioning")).toBe("extracting");
    expect(getDocumentStatusValue("vectorization")).toBe("embedding");
    expect(getDocumentStatusLabel("metadata_awaiting_approval")).toBe(
      "Awaiting review (metadata)",
    );
  });

  it("formats file sizes using readable units", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("document pipeline navigation helpers", () => {
  it("routes active pipeline documents to the live status page", () => {
    const document = mapBackendDocument({
      ...backendDocument,
      processing_status: "chunking",
    });

    expect(isDocumentInPipeline(document)).toBe(true);
    expect(isDocumentActivelyProcessing(document)).toBe(true);
    expect(isDocumentAwaitingReview(document)).toBe(false);
    expect(getDocumentPipelineStatusPath(document)).toBe(
      "/ingestions/status?document_id=doc-1&dataset_id=dataset-1",
    );
  });

  it("treats metadata review as a resumable guided-review state", () => {
    const document = mapBackendDocument({
      ...backendDocument,
      processing_status: "metadata_awaiting_approval",
    });

    expect(isDocumentInPipeline(document)).toBe(true);
    expect(isDocumentActivelyProcessing(document)).toBe(false);
    expect(isDocumentAwaitingReview(document)).toBe(true);
    expect(getDocumentPipelineStatusPath(document)).toBe(
      "/ingestions/status?document_id=doc-1&dataset_id=dataset-1",
    );
  });

  it("keeps completed documents on the document detail route", () => {
    const document = mapBackendDocument({
      ...backendDocument,
      processing_status: "completed",
    });

    expect(isDocumentInPipeline(document)).toBe(false);
    expect(isDocumentActivelyProcessing(document)).toBe(false);
    expect(getDocumentPipelineStatusPath(document)).toBeNull();
  });

  it("resolves dataset names with a stable fallback", () => {
    const document = mapBackendDocument(backendDocument);

    expect(
      getDocumentDatasetName(document, new Map([["dataset-1", "Policies"]])),
    ).toBe("Policies");
    expect(getDocumentDatasetName(document, new Map())).toBe("dataset-1");
    expect(
      getDocumentDatasetName(
        { ...document, datasetIds: [] },
        new Map(),
        "Unknown Dataset",
      ),
    ).toBe("Unknown Dataset");
  });
});

describe("ingestion status helpers", () => {
  it("loads chunks only when the current status needs chunk visibility", () => {
    const loadableStatuses = [
      "vectorization",
      "completed",
      "failed",
      "chunking_awaiting_approval",
      "summarising_awaiting_approval",
      "vectorization_awaiting_approval",
    ];

    for (const status of loadableStatuses) {
      expect(
        shouldLoadIngestionChunks(
          mapBackendDocument({ ...backendDocument, processing_status: status }),
        ),
      ).toBe(true);
    }

    for (const status of [
      "queued",
      "partitioning",
      "metadata_awaiting_approval",
    ]) {
      expect(
        shouldLoadIngestionChunks(
          mapBackendDocument({ ...backendDocument, processing_status: status }),
        ),
      ).toBe(false);
    }
  });
});
