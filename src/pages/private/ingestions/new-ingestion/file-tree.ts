/**
 * Folder-tree grouping for anything that carries a browser-relative path.
 *
 * Deliberately independent of the upload flow: the same tree renders pending
 * uploads on the new-ingestion form and live documents on the batch view, so it
 * knows nothing about either status vocabulary. Callers adapt their own rows
 * into `TreeEntry` and read their payload back off `data`.
 */

export type TreeEntry<TData = unknown> = {
  id: string;
  /** Basename shown in the row. */
  name: string;
  /** Full path including the filename, or null for a loose file. */
  relativePath: string | null;
  size: number;
  /** Opaque status key — counted, never interpreted. */
  status: string;
  data: TData;
};

export type TreeFileNode<TData = unknown> = {
  kind: "file";
  id: string;
  name: string;
  size: number;
  status: string;
  data: TData;
};

export type TreeFolderNode<TData = unknown> = {
  kind: "folder";
  /** Path of the deepest folder in this node, used as the collapse key. */
  path: string;
  /** Display label — spans several segments when a chain was collapsed. */
  name: string;
  children: TreeNode<TData>[];
  fileCount: number;
  totalSize: number;
  /** Counts per status key present beneath this folder. Absent means zero. */
  statusCounts: Record<string, number>;
  /** Every entry id beneath this folder, for bulk actions. */
  itemIds: string[];
};

export type TreeNode<TData = unknown> = TreeFolderNode<TData> | TreeFileNode<TData>;

type MutableFolder<TData> = {
  name: string;
  path: string;
  folders: Map<string, MutableFolder<TData>>;
  files: TreeFileNode<TData>[];
};

function makeFolder<TData>(name: string, path: string): MutableFolder<TData> {
  return { name, path, folders: new Map(), files: [] };
}

function compareNodes<TData>(a: TreeNode<TData>, b: TreeNode<TData>): number {
  if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

// Fold a chain of single-child folders into one row. Without this, a drop of
// `reports/2024/q1/final/` burns four indent levels — and a narrow column has
// no room to spare.
function collapseChain<TData>(folder: MutableFolder<TData>): {
  name: string;
  deepest: MutableFolder<TData>;
} {
  const segments = [folder.name];
  let current = folder;

  while (current.files.length === 0 && current.folders.size === 1) {
    const [only] = current.folders.values();
    segments.push(only.name);
    current = only;
  }

  return { name: segments.join("/"), deepest: current };
}

function finalizeFolder<TData>(
  folder: MutableFolder<TData>,
): TreeFolderNode<TData> {
  const { name, deepest } = collapseChain(folder);

  const children: TreeNode<TData>[] = [
    ...Array.from(deepest.folders.values(), finalizeFolder),
    ...deepest.files,
  ].sort(compareNodes);

  const statusCounts: Record<string, number> = {};
  const itemIds: string[] = [];
  let fileCount = 0;
  let totalSize = 0;

  for (const child of children) {
    if (child.kind === "folder") {
      fileCount += child.fileCount;
      totalSize += child.totalSize;
      itemIds.push(...child.itemIds);
      for (const [status, count] of Object.entries(child.statusCounts)) {
        statusCounts[status] = (statusCounts[status] ?? 0) + count;
      }
      continue;
    }
    fileCount += 1;
    totalSize += child.size;
    itemIds.push(child.id);
    statusCounts[child.status] = (statusCounts[child.status] ?? 0) + 1;
  }

  return {
    kind: "folder",
    path: deepest.path,
    name,
    children,
    fileCount,
    totalSize,
    statusCounts,
    itemIds,
  };
}

/**
 * Group entries into a folder tree using their relative paths. Entries without
 * folder context stay at the root as loose files.
 */
export function buildFileTree<TData>(
  entries: TreeEntry<TData>[],
): TreeNode<TData>[] {
  const root = makeFolder<TData>("", "");

  for (const entry of entries) {
    const fileNode: TreeFileNode<TData> = {
      kind: "file",
      id: entry.id,
      name: entry.name,
      size: entry.size,
      status: entry.status,
      data: entry.data,
    };

    const segments = (entry.relativePath ?? "").split("/").filter(Boolean);
    // The last segment is the filename; anything before it is folder context.
    const folderSegments = segments.slice(0, -1);

    if (folderSegments.length === 0) {
      root.files.push(fileNode);
      continue;
    }

    let cursor = root;
    let path = "";
    for (const segment of folderSegments) {
      path = path ? `${path}/${segment}` : segment;
      let next = cursor.folders.get(segment);
      if (!next) {
        next = makeFolder<TData>(segment, path);
        cursor.folders.set(segment, next);
      }
      cursor = next;
    }
    cursor.files.push(fileNode);
  }

  return [
    ...Array.from(root.folders.values(), finalizeFolder),
    ...root.files,
  ].sort(compareNodes);
}

/** Every folder path in the tree — used by "expand all". */
export function collectFolderPaths<TData>(nodes: TreeNode<TData>[]): string[] {
  const paths: string[] = [];
  const visit = (list: TreeNode<TData>[]) => {
    for (const node of list) {
      if (node.kind !== "folder") continue;
      paths.push(node.path);
      visit(node.children);
    }
  };
  visit(nodes);
  return paths;
}

/**
 * Paths of every folder whose subtree contains a matching file, ancestors
 * included — so revealing a deep match expands the whole chain to it.
 */
export function folderPathsMatching<TData>(
  nodes: TreeNode<TData>[],
  predicate: (file: TreeFileNode<TData>) => boolean,
): string[] {
  const paths: string[] = [];

  const visit = (list: TreeNode<TData>[]): boolean => {
    let matched = false;
    for (const node of list) {
      if (node.kind === "file") {
        if (predicate(node)) matched = true;
        continue;
      }
      if (visit(node.children)) {
        paths.push(node.path);
        matched = true;
      }
    }
    return matched;
  };

  visit(nodes);
  return paths;
}

/** Total entries across the tree, for summary lines. */
export function countStatuses<TData>(
  nodes: TreeNode<TData>[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  const visit = (list: TreeNode<TData>[]) => {
    for (const node of list) {
      if (node.kind === "file") {
        totals[node.status] = (totals[node.status] ?? 0) + 1;
        continue;
      }
      visit(node.children);
    }
  };
  visit(nodes);
  return totals;
}
