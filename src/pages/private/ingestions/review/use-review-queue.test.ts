import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReviewQueue } from "./use-review-queue";

// Minimal EventSource stand-in: tests drive `document_status` events directly.
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  closed = false;
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

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function backendDocument(
  id: string,
  processing_status: string,
  filename = `${id}.pdf`,
) {
  return {
    id,
    filename,
    processing_status,
    file_size: 100,
    dataset_ids: ["dataset-1"],
    updated_at: "2026-07-21T10:00:00.000Z",
  };
}

function latestStream() {
  const stream = FakeEventSource.instances.at(-1);
  if (!stream) throw new Error("no stream opened");
  return stream;
}

function emit(id: string, status: string, filename?: string) {
  act(() => {
    latestStream().emit("document_status", backendDocument(id, status, filename));
  });
}

describe("useReviewQueue", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const render = (documentIds: string[]) =>
    renderHook(() => useReviewQueue({ documentIds, datasetId: "dataset-1" }));

  it("opens one stream carrying every tracked document id", () => {
    render(["a", "b", "c"]);

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latestStream().url).toContain("document_ids=a%2Cb%2Cc");
    expect(latestStream().url).toContain("dataset_id=dataset-1");
  });

  it("collapses a document that appears twice in the roster", () => {
    // Two identical files finalize onto one canonical document.
    const { result } = render(["a", "a", "b"]);

    expect(latestStream().url).toContain("document_ids=a%2Cb");
    expect(result.current.total).toBe(2);

    emit("a", "chunking_awaiting_approval");

    expect(result.current.buckets.awaiting.map((d) => d.id)).toEqual(["a"]);
    expect(result.current.buckets.unknownIds).toEqual(["b"]);
  });

  it("does not reopen the stream when the id array is rebuilt with equal ids", () => {
    const { rerender } = renderHook(
      ({ ids }) => useReviewQueue({ documentIds: ids, datasetId: "dataset-1" }),
      { initialProps: { ids: ["a", "b"] } },
    );

    rerender({ ids: ["a", "b"] });

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latestStream().closed).toBe(false);
  });

  it("treats unreported documents as unknown rather than done", () => {
    const { result } = render(["a", "b"]);

    expect(result.current.buckets.unknownIds).toEqual(["a", "b"]);
    expect(result.current.isAllSettled).toBe(false);
    expect(result.current.activeId).toBeNull();
  });

  it("sorts documents into buckets and selects the first awaiting one", () => {
    const { result } = render(["a", "b", "c"]);

    emit("a", "chunking");
    emit("b", "chunking_awaiting_approval");
    emit("c", "completed");

    expect(result.current.buckets.processing.map((d) => d.id)).toEqual(["a"]);
    expect(result.current.buckets.awaiting.map((d) => d.id)).toEqual(["b"]);
    expect(result.current.buckets.completed.map((d) => d.id)).toEqual(["c"]);
    expect(result.current.activeId).toBe("b");
  });

  it("counts the metadata gate as needing review", () => {
    const { result } = render(["a"]);

    emit("a", "metadata_awaiting_approval");

    expect(result.current.buckets.awaiting.map((d) => d.id)).toEqual(["a"]);
    expect(result.current.activeId).toBe("a");
  });

  it("keeps the current document while another starts waiting", () => {
    const { result } = render(["a", "b"]);

    emit("a", "chunking_awaiting_approval");
    expect(result.current.activeId).toBe("a");

    // "b" arriving must not yank the reviewer off "a".
    emit("b", "graph_extraction_awaiting_approval");
    expect(result.current.activeId).toBe("a");
  });

  it("advances once the current document is approved", () => {
    const { result } = render(["a", "b"]);

    emit("a", "chunking_awaiting_approval");
    emit("b", "graph_extraction_awaiting_approval");
    expect(result.current.activeId).toBe("a");

    emit("a", "summarising");
    expect(result.current.activeId).toBe("b");
  });

  it("advances immediately when a mutation result is applied", () => {
    const { result } = render(["a", "b"]);

    emit("a", "chunking_awaiting_approval");
    emit("b", "chunking_awaiting_approval");
    expect(result.current.activeId).toBe("a");

    act(() => {
      result.current.applyDocument({
        ...result.current.buckets.awaiting[0],
        processingStatus: "summarising",
      });
    });

    expect(result.current.activeId).toBe("b");
  });

  it("skips to the next waiting document and marks the skip", () => {
    const { result } = render(["a", "b"]);

    emit("a", "chunking_awaiting_approval");
    emit("b", "chunking_awaiting_approval");

    act(() => result.current.skipCurrent());

    expect(result.current.activeId).toBe("b");
    expect(result.current.skippedIds.has("a")).toBe(true);
  });

  it("offers a skipped document again when it is the only one left", () => {
    const { result } = render(["a"]);

    emit("a", "chunking_awaiting_approval");
    act(() => result.current.skipCurrent());

    // Nothing else is waiting, so the queue must not claim it is empty.
    expect(result.current.activeId).toBe("a");
    expect(result.current.isQueueEmpty).toBe(false);
  });

  it("jumps to a chosen document and clears its skip", () => {
    const { result } = render(["a", "b"]);

    emit("a", "chunking_awaiting_approval");
    emit("b", "chunking_awaiting_approval");
    act(() => result.current.skipCurrent());
    expect(result.current.activeId).toBe("b");

    act(() => result.current.jumpTo("a"));

    expect(result.current.activeId).toBe("a");
    expect(result.current.skippedIds.has("a")).toBe(false);
  });

  it("reports the batch settled only when nothing is pending", () => {
    const { result } = render(["a", "b"]);

    emit("a", "completed");
    emit("b", "failed");

    expect(result.current.isAllSettled).toBe(true);
    expect(result.current.isQueueEmpty).toBe(true);
    expect(result.current.buckets.failed.map((d) => d.id)).toEqual(["b"]);
  });

  it("surfaces a stream error without dropping known statuses", () => {
    const { result } = render(["a"]);

    emit("a", "chunking_awaiting_approval");
    act(() => latestStream().onerror?.());

    expect(result.current.streamError).toContain("Live updates interrupted");
    expect(result.current.activeId).toBe("a");
  });

  it("ignores events for documents outside the batch", () => {
    const { result } = render(["a"]);

    emit("zzz", "chunking_awaiting_approval");

    expect(result.current.buckets.awaiting).toHaveLength(0);
    expect(result.current.buckets.unknownIds).toEqual(["a"]);
  });

  it("drops a document that is deleted mid-batch", () => {
    const { result } = render(["a", "b"]);

    emit("a", "chunking_awaiting_approval");
    emit("b", "chunking_awaiting_approval");
    expect(result.current.activeId).toBe("a");

    act(() => {
      latestStream().emit("document_deleted", { id: "a" });
    });

    // The queue must move on rather than holding a document that is gone.
    expect(result.current.activeId).toBe("b");
    expect(result.current.buckets.deletedIds).toEqual(["a"]);
    expect(result.current.buckets.unknownIds).toEqual([]);
  });

  it("ignores a deletion for a document outside the batch", () => {
    const { result } = render(["a"]);

    emit("a", "chunking_awaiting_approval");
    act(() => {
      latestStream().emit("document_deleted", { id: "zzz" });
    });

    expect(result.current.activeId).toBe("a");
    expect(result.current.buckets.deletedIds).toEqual([]);
  });

  it("does not stay unsettled because of a deleted document", () => {
    const { result } = render(["a", "b"]);

    emit("a", "completed");
    act(() => {
      latestStream().emit("document_deleted", { id: "b" });
    });

    expect(result.current.isAllSettled).toBe(true);
  });

  it("closes the stream on unmount", () => {
    const { unmount } = render(["a"]);
    const stream = latestStream();

    unmount();

    expect(stream.closed).toBe(true);
  });
});
