import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Music,
  Upload,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { env } from "@/config/env";
import { formatFileSize } from "@/core/datasets";
import { cn } from "@/lib/utils";
import {
  buildFileTree,
  collectFolderPaths,
  folderPathsMatching,
  type TreeFolderNode,
  type TreeNode,
} from "./file-tree";
import type { IconComponent, UploadItem } from "./types";
import {
  dataTransferHasDirectory,
  getFileExt,
  isAbortError,
  readDataTransferFiles,
  SUPPORTED_FILE_EXTENSIONS,
  type ScanProgress,
} from "./upload-files";

/** Named in one line rather than a wall of chips — it is reference, not choice. */
const FILE_TYPE_SUMMARY =
  "PDF, DOCX, PPTX, XLSX, CSV, JSON, MD, HTML, TXT and images";

/** Indent stops growing past this depth so filenames keep their width. */
const MAX_INDENT_DEPTH = 4;
const INDENT_STEP_PX = 14;
const BASE_PADDING_PX = 12;

const EXT_ICON: Record<string, { icon: IconComponent; color: string }> = {
  pdf: { icon: FileText, color: "text-red-500 bg-red-50" },
  docx: { icon: FileText, color: "text-blue-500 bg-blue-50" },
  doc: { icon: FileText, color: "text-blue-500 bg-blue-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
  csv: { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
  pptx: { icon: FileImage, color: "text-orange-500 bg-orange-50" },
  json: { icon: FileCode, color: "text-purple-500 bg-purple-50" },
  jsonl: { icon: FileCode, color: "text-purple-500 bg-purple-50" },
  md: { icon: FileCode, color: "text-gray-600 bg-gray-100" },
  txt: { icon: FileText, color: "text-gray-600 bg-gray-100" },
  html: { icon: FileCode, color: "text-orange-600 bg-orange-50" },
  png: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  jpg: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  jpeg: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  tif: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  tiff: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  bmp: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  webp: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  mp4: { icon: Video, color: "text-pink-600 bg-pink-50" },
  mp3: { icon: Music, color: "text-violet-600 bg-violet-50" },
};

function getFileInfo(file: File) {
  return (
    EXT_ICON[getFileExt(file.name)] ?? {
      icon: FileText,
      color: "text-gray-500 bg-gray-100",
    }
  );
}

function indentFor(depth: number) {
  return BASE_PADDING_PX + Math.min(depth, MAX_INDENT_DEPTH) * INDENT_STEP_PX;
}

export function FilePicker({
  items,
  totalSize,
  completedCount,
  isSubmitting,
  onAddFiles,
  onClear,
  onRemove,
  onOpenItemStatus,
}: {
  items: UploadItem[];
  totalSize: number;
  completedCount: number;
  isSubmitting: boolean;
  onAddFiles: (files: File[]) => void;
  onClear: () => void;
  onRemove: (ids: string[]) => void;
  onOpenItemStatus?: (item: UploadItem) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [scan, setScan] = useState<ScanProgress | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  /** Only folder drops surface the scanning indicator. */
  const showScanRef = useRef(false);

  // dragenter/dragleave fire for every child element the cursor crosses, so a
  // plain boolean strobes. Track nesting depth and only clear at zero.
  const dragDepth = useRef(0);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  useEffect(() => () => scanAbortRef.current?.abort(), []);

  const openFileBrowser = () => fileInputRef.current?.click();
  const openFolderBrowser = () => folderInputRef.current?.click();

  const cancelScan = () => scanAbortRef.current?.abort();

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    if (scan) return;

    // Must be read before the first await, while the DataTransfer is live.
    const isFolderDrop = dataTransferHasDirectory(event.dataTransfer);
    showScanRef.current = isFolderDrop;

    const controller = new AbortController();
    scanAbortRef.current = controller;
    if (isFolderDrop) {
      setScan({ files: 0, bytes: 0, skippedHidden: 0, currentPath: null });
    }

    readDataTransferFiles(event.dataTransfer, {
      signal: controller.signal,
      onProgress: (progress) => {
        if (showScanRef.current) setScan(progress);
      },
    })
      .then(onAddFiles)
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          toast.info("Folder scan cancelled.");
          return;
        }
        toast.error("Could not read the dropped folder.");
      })
      .finally(() => {
        scanAbortRef.current = null;
        showScanRef.current = false;
        setScan(null);
      });
  };

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    onAddFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleZoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openFileBrowser();
  };

  const isScanning = scan !== null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={SUPPORTED_FILE_EXTENSIONS.join(",")}
        onChange={handleSelect}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleSelect}
      />

      <div
        role="button"
        tabIndex={isScanning ? -1 : 0}
        aria-label="Add files or a folder. Drop them here, or press Enter to browse."
        aria-busy={isScanning}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragOver(true);
        }}
        onDragLeave={() => {
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragOver(false);
          }
        }}
        onClick={isScanning ? undefined : openFileBrowser}
        onKeyDown={isScanning ? undefined : handleZoneKeyDown}
        className={cn(
          "relative select-none overflow-hidden rounded-xl border border-dashed transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          isScanning
            ? "cursor-default border-indigo-400 bg-indigo-50/40"
            : "cursor-pointer",
          !isScanning &&
            (dragOver
              ? "border-indigo-500 bg-indigo-50/60"
              : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50"),
        )}
      >
        {isScanning ? (
          <ScanningState scan={scan} onCancel={cancelScan} />
        ) : items.length === 0 ? (
          <EmptyFilePicker
            dragOver={dragOver}
            onBrowseFiles={openFileBrowser}
            onBrowseFolder={openFolderBrowser}
          />
        ) : (
          <CompactFilePicker
            onBrowseFiles={openFileBrowser}
            onBrowseFolder={openFolderBrowser}
          />
        )}
      </div>

      {items.length > 0 && (
        <SelectedFilesPanel
          items={items}
          totalSize={totalSize}
          completedCount={completedCount}
          isSubmitting={isSubmitting}
          onClear={onClear}
          onRemove={onRemove}
          onOpenItemStatus={onOpenItemStatus}
        />
      )}
    </>
  );
}

function ScanningState({
  scan,
  onCancel,
}: {
  scan: ScanProgress;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-100">
        <Loader2 className="size-6 animate-spin text-indigo-500" />
      </div>
      <p className="text-sm font-semibold text-indigo-700">Scanning folder…</p>
      <p className="mt-1 text-xs text-gray-500" aria-live="polite">
        {scan.files} file{scan.files === 1 ? "" : "s"} found ·{" "}
        {formatFileSize(scan.bytes)}
        {scan.skippedHidden > 0 && ` · ${scan.skippedHidden} hidden skipped`}
      </p>
      {scan.currentPath && (
        <p className="mt-1 max-w-full truncate px-4 text-[11px] text-gray-400">
          {scan.currentPath}
        </p>
      )}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCancel();
        }}
        className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-300 hover:text-red-600"
      >
        Cancel
      </button>
    </div>
  );
}

function EmptyFilePicker({
  dragOver,
  onBrowseFiles,
  onBrowseFolder,
}: {
  dragOver: boolean;
  onBrowseFiles: () => void;
  onBrowseFolder: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
      <div
        className={cn(
          "mb-3 flex size-11 items-center justify-center rounded-xl transition-colors",
          dragOver ? "bg-indigo-100" : "bg-gray-100",
        )}
      >
        <Upload
          className={cn(
            "size-5 transition-colors",
            dragOver ? "text-indigo-600" : "text-gray-400",
          )}
        />
      </div>
      <p
        className={cn(
          "text-sm font-semibold transition-colors",
          dragOver ? "text-indigo-700" : "text-gray-800",
        )}
      >
        {dragOver ? "Release to add" : "Drop files or a folder here"}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {FILE_TYPE_SUMMARY} · max {env.VITE_MAX_UPLOAD_MB} MB per file
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBrowseFiles();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
          <FileText className="size-3.5 text-gray-400" /> Browse files
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBrowseFolder();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
          <FolderOpen className="size-3.5 text-gray-400" /> Browse folder
        </button>
      </div>
      <p className="mt-3 text-[11px] text-gray-400">
        Folders are scanned recursively · hidden and system folders are skipped
      </p>
    </div>
  );
}

function CompactFilePicker({
  onBrowseFiles,
  onBrowseFolder,
}: {
  onBrowseFiles: () => void;
  onBrowseFolder: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-500">
      <Upload className="size-3.5 text-gray-400" />
      Drop more, or
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBrowseFiles();
        }}
        className="font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
      >
        add files
      </button>
      <span className="text-gray-300">·</span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBrowseFolder();
        }}
        className="font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
      >
        add a folder
      </button>
    </div>
  );
}

type VisibleRow = { node: TreeNode<UploadItem>; depth: number };

function flattenVisible(
  nodes: TreeNode<UploadItem>[],
  expanded: Set<string>,
  depth = 0,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.kind === "folder" && expanded.has(node.path)) {
      rows.push(...flattenVisible(node.children, expanded, depth + 1));
    }
  }
  return rows;
}

function SelectedFilesPanel({
  items,
  totalSize,
  completedCount,
  isSubmitting,
  onClear,
  onRemove,
  onOpenItemStatus,
}: {
  items: UploadItem[];
  totalSize: number;
  completedCount: number;
  isSubmitting: boolean;
  onClear: () => void;
  onRemove: (ids: string[]) => void;
  onOpenItemStatus?: (item: UploadItem) => void;
}) {
  const tree = useMemo(
    () =>
      buildFileTree(
        items.map((item) => ({
          id: item.id,
          name: item.file.name,
          relativePath: item.relativePath,
          size: item.file.size,
          status: item.status,
          data: item,
        })),
      ),
    [items],
  );
  const folderPaths = useMemo(() => collectFolderPaths(tree), [tree]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [wasSubmitting, setWasSubmitting] = useState(isSubmitting);

  // Collapsed-by-default hides failures, which is exactly when detail matters.
  // Reveal the chain down to every failed file once the batch settles. Adjusted
  // during render rather than in an effect so it lands in the same commit.
  if (wasSubmitting !== isSubmitting) {
    setWasSubmitting(isSubmitting);
    if (wasSubmitting && !isSubmitting) {
      const failed = folderPathsMatching(tree, (file) => file.status === "error");
      if (failed.length > 0) {
        setExpanded((prev) => new Set([...prev, ...failed]));
      }
    }
  }

  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const hasFolders = folderPaths.length > 0;
  const allExpanded = hasFolders && expanded.size >= folderPaths.length;
  const rows = flattenVisible(tree, expanded);

  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative border-b border-gray-100 bg-gray-50/70 px-3.5 py-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-gray-700">
            {items.length} file{items.length === 1 ? "" : "s"}
            <span className="font-normal text-gray-400">
              {" "}
              · {formatFileSize(totalSize)}
              {isSubmitting && ` · ${completedCount}/${items.length} done`}
            </span>
          </span>
          <div className="flex items-center gap-1">
            {hasFolders && (
              <button
                type="button"
                onClick={() =>
                  setExpanded(allExpanded ? new Set() : new Set(folderPaths))
                }
                className="rounded-md px-2 py-1 font-medium text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-900"
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </button>
            )}
            <button
              type="button"
              onClick={onClear}
              disabled={isSubmitting}
              className="rounded-md px-2 py-1 font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
        </div>
        {isSubmitting && (
          // Batch-level progress on the list itself, so the count above has a
          // shape even when the action bar is scrolled out of view.
          <span
            className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500 transition-[width] duration-200"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
            aria-hidden
          />
        )}
      </div>
      <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
        {rows.map(({ node, depth }) =>
          node.kind === "folder" ? (
            <FolderRow
              key={`folder:${node.path}`}
              node={node}
              depth={depth}
              expanded={expanded.has(node.path)}
              isSubmitting={isSubmitting}
              onToggle={() => toggleFolder(node.path)}
              onRemove={() => onRemove(node.itemIds)}
            />
          ) : (
            <FileRow
              key={`file:${node.id}`}
              item={node.data}
              name={node.name}
              depth={depth}
              isSubmitting={isSubmitting}
              onRemove={() => onRemove([node.id])}
              onOpenItemStatus={onOpenItemStatus}
            />
          ),
        )}
      </div>
    </div>
  );
}

function FolderRow({
  node,
  depth,
  expanded,
  isSubmitting,
  onToggle,
  onRemove,
}: {
  node: TreeFolderNode<UploadItem>;
  depth: number;
  expanded: boolean;
  isSubmitting: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const FolderIcon = expanded ? FolderOpen : Folder;

  return (
    <div
      className="flex items-center gap-2 py-2.5 pr-3 transition-colors hover:bg-gray-50"
      style={{ paddingLeft: indentFor(depth) }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <Chevron className="size-4 shrink-0 text-gray-400" />
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <FolderIcon className="size-4 text-indigo-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-800">
            {node.name}
          </p>
          <p className="text-[11px] text-gray-400">
            {node.fileCount} file{node.fileCount === 1 ? "" : "s"} ·{" "}
            {formatFileSize(node.totalSize)}
          </p>
        </div>
      </button>
      <FolderStatusChips counts={node.statusCounts} />
      {!isSubmitting && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title={`Remove ${node.fileCount} file${node.fileCount === 1 ? "" : "s"} in ${node.name}`}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function FolderStatusChips({ counts }: { counts: Record<string, number> }) {
  const chips: Array<{ key: string; className: string; label: string }> = [];
  const countOf = (status: string) => counts[status] ?? 0;

  if (countOf("uploading") > 0) {
    chips.push({
      key: "uploading",
      className: "bg-indigo-50 text-indigo-600",
      label: `${countOf("uploading")}↑`,
    });
  }
  if (countOf("done") > 0) {
    chips.push({
      key: "done",
      className: "bg-emerald-50 text-emerald-700",
      label: `${countOf("done")}✓`,
    });
  }
  if (countOf("duplicate") > 0) {
    chips.push({
      key: "duplicate",
      className: "bg-amber-50 text-amber-700",
      label: `${countOf("duplicate")}⧉`,
    });
  }
  if (countOf("error") > 0) {
    chips.push({
      key: "error",
      className: "bg-red-50 text-red-600",
      label: `${countOf("error")}!`,
    });
  }

  if (chips.length === 0) return null;

  return (
    <span className="flex shrink-0 items-center gap-1">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            chip.className,
          )}
        >
          {chip.label}
        </span>
      ))}
    </span>
  );
}

function FileRow({
  item,
  name,
  depth,
  isSubmitting,
  onRemove,
  onOpenItemStatus,
}: {
  item: UploadItem;
  name: string;
  depth: number;
  isSubmitting: boolean;
  onRemove: () => void;
  onOpenItemStatus?: (item: UploadItem) => void;
}) {
  const { icon: Icon, color } = getFileInfo(item.file);
  const [textColor, bgColor] = color.split(" ");

  return (
    <div
      className="flex items-center gap-3 py-2.5 pr-3 transition-colors hover:bg-gray-50"
      style={{ paddingLeft: indentFor(depth) }}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          bgColor,
        )}
      >
        <Icon className={cn("size-4", textColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800" title={item.relativePath ?? name}>
          {name}
        </p>
        {item.status === "uploading" ? (
          <UploadProgress size={item.file.size} progress={item.progress} />
        ) : (
          <p className="text-[11px] text-gray-400">
            {formatFileSize(item.file.size)}
          </p>
        )}
      </div>
      <ItemStatusBadge item={item} />
      {!isSubmitting &&
        onOpenItemStatus &&
        item.documentId &&
        (item.status === "done" || item.status === "duplicate") && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenItemStatus(item);
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-700"
            title={
              item.status === "duplicate"
                ? "Open the existing document's ingestion stages"
                : "Open this document's ingestion stages"
            }
          >
            View stages
            <ArrowRight className="size-3" />
          </button>
        )}
      {!isSubmitting && item.status === "pending" && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Remove"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function UploadProgress({
  size,
  progress,
}: {
  size: number;
  progress?: number;
}) {
  // Some servers report no total to measure against; an indeterminate shimmer
  // is honest where a fabricated percentage would not be.
  const isIndeterminate = progress === undefined;
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            "h-full rounded-full bg-indigo-500",
            isIndeterminate
              ? "w-1/3 animate-pulse"
              : "transition-[width] duration-200",
          )}
          style={isIndeterminate ? undefined : { width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-gray-400">
        {isIndeterminate
          ? formatFileSize(size)
          : `${formatFileSize(size * (progress ?? 0))} / ${formatFileSize(size)}`}
      </span>
    </div>
  );
}

function ItemStatusBadge({ item }: { item: UploadItem }) {
  switch (item.status) {
    case "uploading":
      return (
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-indigo-600">
          <Loader2 className="size-3.5 animate-spin" /> Uploading
        </span>
      );
    case "done":
      return (
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600">
          <CheckCircle2 className="size-3.5" /> Started
        </span>
      );
    case "duplicate":
      return (
        <span
          className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
          title={item.detail || "This file already exists in this dataset."}
        >
          <Copy className="size-3" /> In dataset
        </span>
      );
    case "error":
      return (
        <span
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-red-600"
          title={item.error}
        >
          <AlertCircle className="size-3.5" /> Failed
        </span>
      );
    case "cancelled":
      return (
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          Queued
        </span>
      );
  }
}
