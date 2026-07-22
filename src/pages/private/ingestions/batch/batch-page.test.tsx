import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveIngestionBatch } from "@/core/batches";
import IngestionBatchPage from "./index";

/**
 * Mounts the real page. These assertions are about what actually reaches the
 * DOM — the class of bug that passes typecheck and unit tests but renders
 * nothing (or renders a document that no longer exists).
 */

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  onerror: (() => void) | null = null;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  close() {}

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function backendDocument(
  id: string,
  processing_status: string,
  filename: string,
  source_relative_paths: string[] = [],
) {
  return {
    id,
    hash: "a".repeat(64),
    filename,
    file_size: 1024,
    file_type: "pdf",
    source_relative_paths,
    user_id: "user-1",
    tanent_id: "tenant-1",
    created_at: "2026-07-21T10:00:00.000Z",
    updated_at: "2026-07-21T10:00:00.000Z",
    dataset_ids: ["dataset-1"],
    processing_status,
    mode: "auto",
    processing_details: null,
    doc_metadata: null,
    access_policy: null,
  };
}

function renderBatch(batchId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/ingestions/batch?batch=${batchId}&dataset_id=dataset-1`]}
    >
      <Routes>
        <Route path="/ingestions/batch" element={<IngestionBatchPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function stream() {
  const instance = FakeEventSource.instances.at(-1);
  if (!instance) throw new Error("no stream opened");
  return instance;
}

/** Emits inside act() so React flushes the resulting state updates. */
function emit(type: string, data: unknown) {
  act(() => stream().emit(type, data));
}

describe("ingestion batch page", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function seedBatch(documentIds: string[]) {
    const id = "batch-under-test";
    saveIngestionBatch({
      id,
      datasetId: "dataset-1",
      mode: "auto",
      documentIds,
      startedAt: "2026-07-21T10:00:00.000Z",
    });
    return id;
  }

  it("explains itself when the batch is not in this tab", () => {
    renderBatch("never-stored");

    expect(screen.getByText(/no longer available in this tab/i)).toBeInTheDocument();
  });

  it("renders the batch header and opens a stream", () => {
    renderBatch(seedBatch(["doc-a", "doc-b"]));

    expect(screen.getByText("Ingesting 2 documents")).toBeInTheDocument();
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("shows live stages as documents report in", () => {
    renderBatch(seedBatch(["doc-a", "doc-b"]));

    emit("document_status", backendDocument("doc-a", "chunking", "a.pdf"));
    emit("document_status", backendDocument("doc-b", "completed", "b.pdf"),
    );

    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    expect(screen.getByText("Chunking")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 finished")).toBeInTheDocument();
  });

  it("groups documents by their folder path", () => {
    renderBatch(seedBatch(["doc-a", "doc-b"]));

    emit("document_status", backendDocument("doc-a", "chunking", "a.pdf", ["reports/2024/a.pdf"]),
    );
    emit("document_status", backendDocument("doc-b", "chunking", "b.pdf", ["reports/2024/b.pdf"]),
    );

    // Single-child chains collapse, so the folder reads as one row.
    const folderRow = screen.getByText("reports/2024").closest("button");
    expect(folderRow).not.toBeNull();
    expect(folderRow).toHaveTextContent("2 documents");
    // Collapsed by default: the files are not mounted yet.
    expect(screen.queryByText("a.pdf")).toBeNull();
  });

  it("surfaces a document deleted mid-batch instead of leaving it pending", () => {
    renderBatch(seedBatch(["doc-a"]));

    emit("document_status", backendDocument("doc-a", "chunking", "a.pdf"));
    expect(screen.getByText("Chunking")).toBeInTheDocument();

    emit("document_deleted", { id: "doc-a" });

    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.queryByText("Chunking")).toBeNull();
    // A deleted document is settled — the batch must not wait on it forever.
    expect(screen.getByText("1 of 1 finished")).toBeInTheDocument();
  });

  it("offers a retry only once something has failed", () => {
    renderBatch(seedBatch(["doc-a"]));

    emit("document_status", backendDocument("doc-a", "chunking", "a.pdf"));
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();

    emit("document_status", backendDocument("doc-a", "failed", "a.pdf"));
    expect(
      screen.getByRole("button", { name: /retry 1 failed/i }),
    ).toBeInTheDocument();
  });

  it("counts every state in the funnel so the totals add up", () => {
    renderBatch(seedBatch(["doc-a", "doc-b", "doc-c"]));

    emit("document_status", backendDocument("doc-a", "completed", "a.pdf"));
    emit("document_status", backendDocument("doc-b", "failed", "b.pdf"));

    const header = screen.getByText("Ingesting 3 documents").closest("div")
      ?.parentElement?.parentElement as HTMLElement;
    expect(within(header).getByText("1 completed")).toBeInTheDocument();
    expect(within(header).getByText("1 failed")).toBeInTheDocument();
    // The third has not reported — it must be visible as unreported, not lost.
    expect(within(header).getByText("1 unreported")).toBeInTheDocument();
  });
});
