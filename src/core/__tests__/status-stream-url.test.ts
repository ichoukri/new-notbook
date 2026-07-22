import { describe, expect, it } from "vitest";
import {
  MAX_STREAMED_DOCUMENT_IDS,
  buildDocumentStatusStreamUrl,
  needsStreamSubscription,
} from "../ingestions";

function idsOf(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `0000000${index}`.slice(-8).padStart(36, "a"),
  );
}

function paramsOf(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe("buildDocumentStatusStreamUrl", () => {
  it("puts a small batch in the id filter", () => {
    const params = paramsOf(
      buildDocumentStatusStreamUrl({
        documentIds: ["a", "b", "c"],
        datasetId: "dataset-1",
      }),
    );

    expect(params.get("document_ids")).toBe("a,b,c");
    expect(params.get("dataset_id")).toBe("dataset-1");
  });

  it("drops blank ids", () => {
    const params = paramsOf(
      buildDocumentStatusStreamUrl({ documentIds: ["a", "", "b"] }),
    );

    expect(params.get("document_ids")).toBe("a,b");
  });

  it("sends a subscription token instead of ids when one is supplied", () => {
    const params = paramsOf(
      buildDocumentStatusStreamUrl({
        documentIds: idsOf(200),
        datasetId: "dataset-1",
        subscription: "tok-abc",
      }),
    );

    expect(params.get("subscription")).toBe("tok-abc");
    expect(params.get("document_ids")).toBeNull();
    expect(params.get("dataset_id")).toBe("dataset-1");
  });

  it("keeps the id filter exactly at the cap", () => {
    expect(needsStreamSubscription(idsOf(MAX_STREAMED_DOCUMENT_IDS))).toBe(false);

    const params = paramsOf(
      buildDocumentStatusStreamUrl({
        documentIds: idsOf(MAX_STREAMED_DOCUMENT_IDS),
        datasetId: "dataset-1",
      }),
    );

    expect(params.get("document_ids")?.split(",")).toHaveLength(
      MAX_STREAMED_DOCUMENT_IDS,
    );
  });

  it("requires a subscription past the cap", () => {
    expect(needsStreamSubscription(idsOf(MAX_STREAMED_DOCUMENT_IDS + 1))).toBe(
      true,
    );
  });

  it("ignores blank ids when deciding whether a subscription is needed", () => {
    const padded = [...idsOf(MAX_STREAMED_DOCUMENT_IDS), "", ""];

    expect(needsStreamSubscription(padded)).toBe(false);
  });

  it("keeps a capped url within a safe request-line budget", () => {
    const url = buildDocumentStatusStreamUrl({
      documentIds: idsOf(MAX_STREAMED_DOCUMENT_IDS),
      datasetId: "dataset-1",
    });

    expect(url.length).toBeLessThan(4000);
  });
});
