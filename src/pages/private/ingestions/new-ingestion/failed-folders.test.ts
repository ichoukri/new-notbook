import { describe, expect, it } from "vitest";
import { collectFailedFolders } from "./failed-folders";
import type { UploadItem, UploadStatus } from "./types";

function makeItem(
  relativePath: string | null,
  status: UploadStatus = "done",
): UploadItem {
  const name = (relativePath ?? "loose.pdf").split("/").pop() ?? "loose.pdf";
  const file = new File(["x"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: 10 });
  return { id: relativePath ?? name, file, relativePath, status };
}

describe("collectFailedFolders", () => {
  it("reports nothing when no upload failed", () => {
    expect(
      collectFailedFolders([
        makeItem("docs/a.pdf"),
        makeItem("docs/b.pdf", "duplicate"),
      ]),
    ).toEqual([]);
  });

  it("ignores loose files with no folder context", () => {
    expect(collectFailedFolders([makeItem(null, "error")])).toEqual([]);
  });

  it("names the folder holding the failures with its share", () => {
    const found = collectFailedFolders([
      makeItem("4-BOM/a.pdf", "error"),
      makeItem("4-BOM/b.pdf", "error"),
      makeItem("4-BOM/c.pdf", "done"),
    ]);

    expect(found).toEqual([{ path: "4-BOM", failed: 2, total: 3 }]);
  });

  it("blames the deepest folder, not every ancestor", () => {
    // Listing both "reports" and "reports/2024" would double-count and bury the
    // folder actually at fault.
    const found = collectFailedFolders([
      makeItem("reports/2024/a.pdf", "error"),
      makeItem("reports/2024/b.pdf", "error"),
      makeItem("reports/ok.pdf", "done"),
    ]);

    expect(found.map((folder) => folder.path)).toEqual(["reports/2024"]);
  });

  it("still reports an ancestor for failures that are its own", () => {
    const found = collectFailedFolders([
      makeItem("reports/direct.pdf", "error"),
      makeItem("reports/2024/nested.pdf", "error"),
    ]);

    const paths = found.map((folder) => folder.path);
    expect(paths).toContain("reports");
    expect(paths).toContain("reports/2024");
  });

  it("orders the worst folder first", () => {
    const found = collectFailedFolders([
      makeItem("small/a.pdf", "error"),
      makeItem("big/a.pdf", "error"),
      makeItem("big/b.pdf", "error"),
      makeItem("big/c.pdf", "error"),
    ]);

    expect(found[0].path).toBe("big");
    expect(found[0].failed).toBe(3);
  });

  it("does not count cancelled uploads as failures", () => {
    expect(
      collectFailedFolders([
        makeItem("docs/a.pdf", "cancelled"),
        makeItem("docs/b.pdf", "cancelled"),
      ]),
    ).toEqual([]);
  });
});
