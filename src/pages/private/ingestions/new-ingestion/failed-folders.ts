import { buildFileTree, type TreeFolderNode, type TreeNode } from "./file-tree";
import type { UploadItem } from "./types";

export type FailedFolder = { path: string; failed: number; total: number };

/**
 * Deepest folders containing failures, worst first.
 *
 * Only leaf-most folders are reported: naming both `reports/` and
 * `reports/2024/` for the same failures would double-count and bury the
 * specific folder actually at fault.
 */
export function collectFailedFolders(items: UploadItem[]): FailedFolder[] {
  const tree = buildFileTree(
    items.map((item) => ({
      id: item.id,
      name: item.file.name,
      relativePath: item.relativePath,
      size: item.file.size,
      status: item.status,
      data: item,
    })),
  );

  const found: FailedFolder[] = [];

  const visit = (nodes: TreeNode<UploadItem>[]) => {
    for (const node of nodes) {
      if (node.kind !== "folder") continue;
      const folder = node as TreeFolderNode<UploadItem>;
      const failed = folder.statusCounts.error ?? 0;
      if (failed === 0) continue;

      const childFolderFailures = folder.children.reduce(
        (sum, child) =>
          child.kind === "folder" ? sum + (child.statusCounts.error ?? 0) : sum,
        0,
      );

      // Report this folder only for failures that are its own, so the blame
      // lands on the deepest folder responsible.
      if (failed > childFolderFailures) {
        found.push({
          path: folder.path,
          failed,
          total: folder.fileCount,
        });
      }
      visit(folder.children);
    }
  };

  visit(tree);
  return found.sort((a, b) => b.failed - a.failed);
}
