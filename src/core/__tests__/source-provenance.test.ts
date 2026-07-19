import { describe, expect, it } from "vitest";
import { mapSourceRelativePaths } from "@/core/source-provenance";

describe("source provenance mapping", () => {
  it("preserves canonical-first order while removing unusable duplicates", () => {
    expect(
      mapSourceRelativePaths(
        [
          " 1-Grinding 1/Manuals/Grinding.pdf ",
          "1-Grinding 1/Archive/Grinding.pdf",
          "1-Grinding 1/Manuals/Grinding.pdf",
          "",
          null,
        ],
        "legacy/Grinding.pdf",
      ),
    ).toEqual([
      "1-Grinding 1/Manuals/Grinding.pdf",
      "1-Grinding 1/Archive/Grinding.pdf",
    ]);
  });

  it("falls back to the singular legacy field when the list is unusable", () => {
    expect(
      mapSourceRelativePaths([null, "  "], " 1-Grinding 1/Grinding.pdf "),
    ).toEqual(["1-Grinding 1/Grinding.pdf"]);
    expect(mapSourceRelativePaths("not-an-array", null)).toEqual([]);
  });
});
