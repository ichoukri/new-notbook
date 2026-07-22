import { describe, expect, it } from "vitest";
import {
  buildFileTree,
  collectFolderPaths,
  countStatuses,
  folderPathsMatching,
  type TreeEntry,
  type TreeFolderNode,
} from "./file-tree";

function makeItem(
  relativePath: string | null,
  { size = 10, status = "pending" } = {},
): TreeEntry<{ label: string }> {
  const name = (relativePath ?? "loose.pdf").split("/").pop() ?? "loose.pdf";
  return {
    id: relativePath ?? name,
    name,
    relativePath,
    size,
    status,
    data: { label: name },
  };
}

function folder(node: unknown): TreeFolderNode<{ label: string }> {
  return node as TreeFolderNode<{ label: string }>;
}

describe("file tree", () => {
  it("keeps files without folder context at the root", () => {
    const tree = buildFileTree([makeItem(null), makeItem(null)]);

    expect(tree).toHaveLength(2);
    expect(tree.every((node) => node.kind === "file")).toBe(true);
    expect(collectFolderPaths(tree)).toEqual([]);
  });

  it("groups files under their folders and rolls up size and counts", () => {
    const tree = buildFileTree([
      makeItem("reports/2024/q1.pdf", { size: 100 }),
      makeItem("reports/2024/q2.pdf", { size: 200 }),
      makeItem("reports/2023/q1.pdf", { size: 50 }),
    ]);

    expect(tree).toHaveLength(1);
    const reports = folder(tree[0]);
    expect(reports.name).toBe("reports");
    expect(reports.fileCount).toBe(3);
    expect(reports.totalSize).toBe(350);
    expect(reports.itemIds).toHaveLength(3);

    // 2023 sorts before 2024.
    const [y2023, y2024] = reports.children.map(folder);
    expect(y2023.name).toBe("2023");
    expect(y2023.fileCount).toBe(1);
    expect(y2024.name).toBe("2024");
    expect(y2024.totalSize).toBe(300);
  });

  it("collapses single-child folder chains into one row", () => {
    const tree = buildFileTree([makeItem("a/b/c/deep.pdf")]);

    expect(tree).toHaveLength(1);
    const collapsed = folder(tree[0]);
    expect(collapsed.name).toBe("a/b/c");
    // The collapse key stays the deepest real path so it is unique.
    expect(collapsed.path).toBe("a/b/c");
    expect(collapsed.children).toHaveLength(1);
    expect(collapsed.children[0].kind).toBe("file");
  });

  it("stops collapsing where the tree actually branches", () => {
    const tree = buildFileTree([
      makeItem("a/b/one/x.pdf"),
      makeItem("a/b/two/y.pdf"),
    ]);

    const root = folder(tree[0]);
    expect(root.name).toBe("a/b");
    expect(root.children.map((child) => child.name)).toEqual(["one", "two"]);
  });

  it("sorts folders before loose files", () => {
    const tree = buildFileTree([
      makeItem(null),
      makeItem("zzz/nested.pdf"),
    ]);

    expect(tree.map((node) => node.kind)).toEqual(["folder", "file"]);
  });

  it("aggregates status counts across the subtree", () => {
    const tree = buildFileTree([
      makeItem("docs/a.pdf", { status: "done" }),
      makeItem("docs/b.pdf", { status: "error" }),
      makeItem("docs/nested/c.pdf", { status: "error" }),
      makeItem("docs/nested/d.pdf", { status: "duplicate" }),
    ]);

    const docs = folder(tree[0]);
    expect(docs.statusCounts.done).toBe(1);
    expect(docs.statusCounts.error).toBe(2);
    expect(docs.statusCounts.duplicate).toBe(1);
    // Absent means zero — the tree does not know any status vocabulary.
    expect(docs.statusCounts.pending).toBeUndefined();
  });

  it("counts arbitrary status keys so pipeline stages work too", () => {
    const tree = buildFileTree([
      makeItem("docs/a.pdf", { status: "chunking" }),
      makeItem("docs/b.pdf", { status: "chunking" }),
      makeItem("docs/c.pdf", { status: "graph_extraction_awaiting_approval" }),
    ]);

    expect(countStatuses(tree)).toEqual({
      chunking: 2,
      graph_extraction_awaiting_approval: 1,
    });
  });

  it("carries the caller's payload through to the file nodes", () => {
    const tree = buildFileTree([makeItem("docs/a.pdf")]);
    const docs = folder(tree[0]);
    const file = docs.children[0];

    expect(file.kind).toBe("file");
    if (file.kind === "file") {
      expect(file.data).toEqual({ label: "a.pdf" });
    }
  });

  it("returns the whole ancestor chain for matching files", () => {
    const tree = buildFileTree([
      makeItem("docs/keep/ok.pdf", { status: "done" }),
      makeItem("docs/deep/nested/bad.pdf", { status: "error" }),
    ]);

    const failed = folderPathsMatching(tree, (file) => file.status === "error");

    // "deep/nested" collapses into one node, so its ancestor "docs" plus the
    // collapsed node itself are what must open to reveal the failure.
    expect(failed).toContain("docs");
    expect(failed).toContain("docs/deep/nested");
    expect(failed).not.toContain("docs/keep");
  });

  it("reports no matches when nothing matches", () => {
    const tree = buildFileTree([makeItem("docs/a.pdf", { status: "done" })]);
    expect(folderPathsMatching(tree, (file) => file.status === "error")).toEqual(
      [],
    );
  });
});
