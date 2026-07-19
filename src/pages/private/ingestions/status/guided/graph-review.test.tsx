import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { backendApi } from "@/core/api";
import { GraphReview, type TGraphReviewState } from "./graph-review";

vi.mock("@/core/api", () => ({
  backendApi: {
    get: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const entity = {
  id: "11111111-1111-1111-1111-111111111111",
  run_id: "22222222-2222-2222-2222-222222222222",
  document_id: "document-1",
  chunk_id: "chunk-1",
  chunk_version: 3,
  canonical_id: "equipment:6210-ml-2175",
  name: "6210-ML-2175",
  normalized_name: "6210-ml-2175",
  entity_type: "Equipment",
  aliases: ["SAG Mill"],
  description: "Primary grinding mill",
  confidence: 0.94,
  status: "pending",
  evidence: [{ text: "Inspect 6210-ML-2175 weekly.", page_number: 7 }],
  page_number: 7,
};

describe("GraphReview", () => {
  const getMock = vi.mocked(backendApi.get);
  const createMock = vi.mocked(backendApi.create);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads paginated candidates and unlocks publish after the last decision", async () => {
    let reviewed = false;
    getMock.mockImplementation(async (path, params) => {
      if (path.endsWith("/graph/runs/latest")) {
        return {
          id: "22222222-2222-2222-2222-222222222222",
          status: "completed",
          chunk_version: 3,
          ontology_version: "mining-v1",
          stats: { entity_candidates: 1, relation_candidates: 0 },
        };
      }
      if (path.endsWith("/graph/entities")) {
        const pendingOnly = params?.status === "pending";
        const pageRequest = params?.limit === "12";
        const items = reviewed
          ? pageRequest
            ? [{ ...entity, status: "approved" }]
            : []
          : [entity];
        return {
          items,
          total: pendingOnly ? (reviewed ? 0 : 1) : 1,
          offset: Number(params?.offset ?? 0),
          limit: Number(params?.limit ?? 1),
        };
      }
      if (path.endsWith("/graph/relations")) {
        return {
          items: [],
          total: 0,
          offset: Number(params?.offset ?? 0),
          limit: Number(params?.limit ?? 1),
        };
      }
      throw new Error(`Unexpected GET ${path}`);
    });
    createMock.mockImplementation(async () => {
      reviewed = true;
      return { updated_count: 1 };
    });
    const states: TGraphReviewState[] = [];

    render(
      <GraphReview
        documentId="document-1"
        disabled={false}
        onStateChange={(state) => states.push(state)}
      />,
    );

    expect(await screen.findByText("6210-ML-2175")).toBeInTheDocument();
    expect(screen.getByText("Inspect 6210-ML-2175 weekly.", { exact: false })).toBeInTheDocument();
    await waitFor(() => {
      expect(states.at(-1)).toMatchObject({ pendingCount: 1, ready: false });
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        "/documents/document-1/graph/review",
        expect.objectContaining({
          run_id: "22222222-2222-2222-2222-222222222222",
          candidate_kind: "entity",
          candidate_ids: ["11111111-1111-1111-1111-111111111111"],
          decision: "approved",
        }),
      );
    });
    await waitFor(() => {
      expect(states.at(-1)).toMatchObject({ pendingCount: 0, ready: true });
    });
  });
});
