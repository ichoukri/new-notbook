import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRAPH_EXPLORER_STATE,
  getActiveGraphFilters,
  readGraphExplorerState,
  resolveScopeId,
  writeGraphExplorerState,
} from "./graph-url-state";

const ENTITY_ID = "ent_0123456789abcdef01234567";

describe("readGraphExplorerState", () => {
  it("falls back to defaults for an empty query string", () => {
    expect(readGraphExplorerState(new URLSearchParams())).toEqual(
      DEFAULT_GRAPH_EXPLORER_STATE,
    );
  });

  it("reads a fully specified view", () => {
    const params = new URLSearchParams(
      `scope=document&document=doc-1&q=mill&type=Equipment&excluded=1&offset=48&entity=${ENTITY_ID}&depth=2`,
    );

    expect(readGraphExplorerState(params)).toEqual({
      scopeKind: "document",
      datasetId: "",
      documentId: "doc-1",
      search: "mill",
      entityType: "Equipment",
      includeExcluded: true,
      offset: 48,
      entityId: ENTITY_ID,
      depth: 2,
    });
  });

  it("rejects values a hand-edited link could smuggle in", () => {
    const params = new URLSearchParams(
      "scope=nonsense&type=DROP TABLE&offset=-5&entity=equipment:mill-1&depth=9",
    );
    const state = readGraphExplorerState(params);

    expect(state.scopeKind).toBe("dataset");
    expect(state.entityType).toBe("all");
    expect(state.offset).toBe(0);
    expect(state.entityId).toBe("");
    expect(state.depth).toBe(1);
  });

  it("clamps an overlong search to the backend limit", () => {
    const params = new URLSearchParams();
    params.set("q", "x".repeat(400));

    expect(readGraphExplorerState(params).search).toHaveLength(300);
  });

  it("ignores a non-integer offset", () => {
    const params = new URLSearchParams("offset=12.7abc");
    expect(readGraphExplorerState(params).offset).toBe(0);
  });
});

describe("writeGraphExplorerState", () => {
  it("omits defaults so a plain view has a clean URL", () => {
    expect(writeGraphExplorerState(DEFAULT_GRAPH_EXPLORER_STATE).toString()).toBe(
      "",
    );
  });

  it("keeps both scope ids so toggling scope kind does not lose a selection", () => {
    const params = writeGraphExplorerState({
      ...DEFAULT_GRAPH_EXPLORER_STATE,
      scopeKind: "dataset",
      datasetId: "dataset-1",
      documentId: "doc-1",
    });

    expect(params.get("dataset")).toBe("dataset-1");
    expect(params.get("document")).toBe("doc-1");
    // The default scope kind is still left implicit.
    expect(params.get("scope")).toBeNull();
  });

  it("round-trips a fully specified view", () => {
    const state = {
      scopeKind: "document" as const,
      datasetId: "",
      documentId: "doc-1",
      search: "mill",
      entityType: "Equipment",
      includeExcluded: true,
      offset: 48,
      entityId: ENTITY_ID,
      depth: 2 as const,
    };

    expect(readGraphExplorerState(writeGraphExplorerState(state))).toEqual(state);
  });

  it("refuses to serialize invalid entity ids and types", () => {
    const params = writeGraphExplorerState({
      ...DEFAULT_GRAPH_EXPLORER_STATE,
      entityId: "not-an-entity",
      entityType: "Bogus",
      search: "   ",
    });

    expect(params.toString()).toBe("");
  });
});

describe("getActiveGraphFilters", () => {
  it("lists only non-default filters", () => {
    expect(getActiveGraphFilters(DEFAULT_GRAPH_EXPLORER_STATE)).toEqual([]);

    const filters = getActiveGraphFilters({
      ...DEFAULT_GRAPH_EXPLORER_STATE,
      search: "mill",
      entityType: "Equipment",
      includeExcluded: true,
    });

    expect(filters.map((filter) => filter.key)).toEqual([
      "search",
      "entityType",
      "includeExcluded",
    ]);
  });
});

describe("resolveScopeId", () => {
  it("keeps a requested id that is still available", () => {
    expect(resolveScopeId("b", ["a", "b"])).toBe("b");
  });

  it("falls back to the first option when the request is stale or empty", () => {
    expect(resolveScopeId("missing", ["a", "b"])).toBe("a");
    expect(resolveScopeId("", ["a", "b"])).toBe("a");
    expect(resolveScopeId("a", [])).toBe("");
  });
});
