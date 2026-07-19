import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import {
  formatConfidence,
  getGraphErrorState,
  isCanonicalEntityId,
  parseAliases,
} from "./graph-explorer-utils";

describe("knowledge graph explorer helpers", () => {
  it("distinguishes a disabled graph from a temporary outage", () => {
    const disabled = new AxiosError(
      "Request failed",
      undefined,
      undefined,
      undefined,
      { status: 503, data: { detail: "Knowledge graph is disabled" } } as never,
    );
    const unavailable = new AxiosError(
      "Request failed",
      undefined,
      undefined,
      undefined,
      { status: 503, data: { detail: "Neo4j is unavailable" } } as never,
    );

    expect(getGraphErrorState(disabled)).toMatchObject({
      kind: "disabled",
      retryable: false,
    });
    expect(getGraphErrorState(unavailable)).toMatchObject({
      kind: "unavailable",
      retryable: true,
    });
  });

  it("deduplicates aliases and formats confidence", () => {
    expect(parseAliases("SAG Mill, Mill A\nSAG Mill,  ")).toEqual([
      "SAG Mill",
      "Mill A",
    ]);
    expect(formatConfidence(0.946)).toBe("95%");
    expect(formatConfidence(null)).toBe("Not scored");
    expect(isCanonicalEntityId("ent_0123456789abcdef01234567")).toBe(true);
    expect(isCanonicalEntityId("equipment:mill-1")).toBe(false);
  });
});
