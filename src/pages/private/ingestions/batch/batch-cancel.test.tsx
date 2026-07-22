import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveIngestionBatch } from "@/core/batches";
import IngestionBatchPage from "./index";

/**
 * Stopping work mid-pipeline. The backend revokes the Celery task and purges
 * artifacts; these tests cover the wiring and, importantly, the 409 that a
 * stage holding the document lock returns — a normal race here, not a failure.
 */

const apiCreate = vi.hoisted(() => vi.fn());

vi.mock("@/core/api", () => ({
  backendApi: { create: apiCreate, get: vi.fn() },
}));

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

function backendDocument(id: string, processing_status: string, filename: string) {
  return {
    id,
    hash: "a".repeat(64),
    filename,
    file_size: 1024,
    file_type: "pdf",
    source_relative_paths: [],
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

function emit(type: string, data: unknown) {
  act(() => FakeEventSource.instances.at(-1)!.emit(type, data));
}

function renderBatch(documentIds: string[]) {
  const id = "batch-cancel";
  saveIngestionBatch({
    id,
    datasetId: "dataset-1",
    mode: "auto",
    documentIds,
    startedAt: "2026-07-21T10:00:00.000Z",
  });
  return render(
    <MemoryRouter
      initialEntries={[`/ingestions/batch?batch=${id}&dataset_id=dataset-1`]}
    >
      <Routes>
        <Route path="/ingestions/batch" element={<IngestionBatchPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("batch cancellation", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    sessionStorage.clear();
    apiCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers no stop control once nothing is in flight", () => {
    renderBatch(["doc-a"]);
    emit("document_status", backendDocument("doc-a", "completed", "a.pdf"));

    expect(screen.queryByRole("button", { name: /stop all/i })).toBeNull();
  });

  it("confirms before discarding work, and says the file is kept", async () => {
    renderBatch(["doc-a"]);
    emit("document_status", backendDocument("doc-a", "chunking", "a.pdf"));

    act(() => {
      screen.getByRole("button", { name: /stop all/i }).click();
    });

    expect(await screen.findByText(/discarded/i)).toBeInTheDocument();
    expect(screen.getByText(/uploaded file is kept/i)).toBeInTheDocument();
    // Nothing is sent until the user confirms.
    expect(apiCreate).not.toHaveBeenCalled();
  });

  it("cancels every in-flight document on confirm", async () => {
    apiCreate.mockImplementation(async (path: string) => ({
      data: backendDocument(
        path.split("/")[2],
        "cancelled",
        `${path.split("/")[2]}.pdf`,
      ),
    }));

    renderBatch(["doc-a", "doc-b", "doc-c"]);
    emit("document_status", backendDocument("doc-a", "chunking", "a.pdf"));
    emit("document_status", backendDocument("doc-b", "partitioning", "b.pdf"));
    // Already finished — must not be cancelled.
    emit("document_status", backendDocument("doc-c", "completed", "c.pdf"));

    act(() => {
      screen.getByRole("button", { name: /stop all/i }).click();
    });
    act(() => {
      screen.getByRole("button", { name: /^stop 2$/i }).click();
    });

    await waitFor(() => expect(apiCreate).toHaveBeenCalledTimes(2));
    const calledPaths = apiCreate.mock.calls.map((call) => call[0]);
    expect(calledPaths).toContain("/documents/doc-a/cancel");
    expect(calledPaths).toContain("/documents/doc-b/cancel");
    expect(calledPaths).not.toContain("/documents/doc-c/cancel");
  });

  it("keeps cancelling the rest when one document is mid-stage (409)", async () => {
    apiCreate.mockImplementation(async (path: string) => {
      if (path.includes("doc-a")) {
        throw { response: { status: 409, data: { detail: "still processing" } } };
      }
      return { data: backendDocument("doc-b", "cancelled", "b.pdf") };
    });

    renderBatch(["doc-a", "doc-b"]);
    emit("document_status", backendDocument("doc-a", "chunking", "a.pdf"));
    emit("document_status", backendDocument("doc-b", "chunking", "b.pdf"));

    act(() => {
      screen.getByRole("button", { name: /stop all/i }).click();
    });
    act(() => {
      screen.getByRole("button", { name: /^stop 2$/i }).click();
    });

    // A lock conflict on one must not abort the others.
    await waitFor(() => expect(apiCreate).toHaveBeenCalledTimes(2));
  });
});
