import { describe, expect, it } from "vitest";
import { escapeRegExp, highlightParts } from "./highlight";

describe("retrieval highlight helpers", () => {
  it("escapes regular expression syntax in query terms", () => {
    expect(escapeRegExp("rate.limit?")).toBe("rate\\.limit\\?");
  });

  it("splits matching query words into alternating parts", () => {
    expect(highlightParts("Install the SDK today", "SDK install")).toEqual([
      "",
      "Install",
      " the ",
      "SDK",
      " today",
    ]);
  });

  it("returns the original text for an empty query", () => {
    expect(highlightParts("Plain text", "   ")).toEqual(["Plain text"]);
  });
});
