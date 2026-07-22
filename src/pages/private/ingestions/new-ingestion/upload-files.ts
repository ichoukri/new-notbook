import { env } from "@/config/env";

export const UPLOAD_CONCURRENCY = 3;
export const MAX_FILE_SIZE_BYTES = env.VITE_MAX_UPLOAD_MB * 1024 * 1024;
export const SUPPORTED_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".csv",
  ".json",
  ".jsonl",
  ".md",
  ".html",
  ".htm",
  ".pptx",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".tif",
  ".tiff",
  ".bmp",
  ".webp",
] as const;

// Directories that are never document sources. Dot-prefixed names (.git,
// .venv, .idea, .cache) are covered by the generic hidden-segment rule below;
// these are the common non-dotted offenders. Dropping a project folder that
// contains one of these would otherwise enumerate tens of thousands of entries.
export const IGNORED_DIRECTORY_NAMES = new Set([
  "node_modules",
  "__pycache__",
  "venv",
]);

export type CollectResult = {
  accepted: File[];
  skippedMacOSSidecars: number;
  skippedHidden: number;
  skippedUnsupported: number;
  skippedOversize: number;
};

export function getFileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isHiddenName(segment: string): boolean {
  return segment.startsWith(".");
}

export function isIgnoredDirectoryName(name: string): boolean {
  return isHiddenName(name) || IGNORED_DIRECTORY_NAMES.has(name);
}

// Files chosen through <input webkitdirectory> arrive already flattened, so the
// walk's per-directory pruning never sees them. Re-check the whole path here so
// both entry points skip the same things.
export function hasIgnoredPathSegment(file: File): boolean {
  const path = file.webkitRelativePath;
  if (!path) return isHiddenName(file.name);

  const segments = path
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);

  return segments.some((segment, index) =>
    index === segments.length - 1
      ? isHiddenName(segment)
      : isIgnoredDirectoryName(segment),
  );
}

export function normalizeRelativePath(
  path: string | null | undefined,
): string | null {
  if (!path) return null;

  const segments = path
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment && segment !== ".");

  // A plain filename is not folder context. Keeping this as null preserves the
  // existing single-file upload payload while folder selections retain their
  // browser-provided root and nested directories.
  if (segments.length < 2 || segments.includes("..")) return null;
  return segments.join("/");
}

export function getFileRelativePath(file: File): string | null {
  return normalizeRelativePath(file.webkitRelativePath);
}

export function buildUploadFileMetadata(
  file: File,
  relativePath = getFileRelativePath(file),
) {
  return {
    filename: file.name,
    source_relative_path: normalizeRelativePath(relativePath),
    file_size: file.size,
    content_type: file.type || null,
  };
}

function withRelativePath(file: File, relativePath: string): File {
  const normalizedPath = relativePath
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

  if (!normalizedPath || file.webkitRelativePath === normalizedPath) {
    return file;
  }

  try {
    // Files returned by FileSystemEntry.file() do not receive the
    // webkitRelativePath that <input webkitdirectory> provides. Attach the same
    // read-only-looking browser property so the rest of the upload flow treats
    // folder selection and folder drag-and-drop identically.
    Object.defineProperty(file, "webkitRelativePath", {
      configurable: true,
      value: normalizedPath,
    });
    return file;
  } catch {
    const copy = new File([file], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
    Object.defineProperty(copy, "webkitRelativePath", {
      configurable: true,
      value: normalizedPath,
    });
    return copy;
  }
}

export function makeItemId(file: File): string {
  return `${getFileRelativePath(file) || file.name}-${file.size}-${file.lastModified}`;
}

export function isMacOSSidecar(file: File): boolean {
  return file.name.startsWith("._");
}

export function isSupportedFile(file: File): boolean {
  const extension = `.${getFileExt(file.name)}`;
  return SUPPORTED_FILE_EXTENSIONS.includes(
    extension as (typeof SUPPORTED_FILE_EXTENSIONS)[number],
  );
}

export function collectAcceptedFiles(files: File[]): CollectResult {
  const accepted: File[] = [];
  let skippedMacOSSidecars = 0;
  let skippedHidden = 0;
  let skippedUnsupported = 0;
  let skippedOversize = 0;
  for (const file of files) {
    // Sidecars are dot-prefixed too, so they must be classified before the
    // generic hidden check to keep their count meaningful.
    if (isMacOSSidecar(file)) {
      skippedMacOSSidecars += 1;
      continue;
    }
    if (hasIgnoredPathSegment(file)) {
      skippedHidden += 1;
      continue;
    }
    if (!isSupportedFile(file)) {
      skippedUnsupported += 1;
      continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      skippedOversize += 1;
      continue;
    }
    accepted.push(file);
  }
  return {
    accepted,
    skippedMacOSSidecars,
    skippedHidden,
    skippedUnsupported,
    skippedOversize,
  };
}

export type ScanProgress = {
  files: number;
  bytes: number;
  skippedHidden: number;
  /** Folder currently being enumerated, for the scanning indicator. */
  currentPath: string | null;
};

export type ReadDataTransferOptions = {
  /** Aborts the walk; the returned promise rejects with an AbortError. */
  signal?: AbortSignal;
  onProgress?: (progress: ScanProgress) => void;
  /** Throttle window for onProgress, so a big folder can't flood React. */
  progressIntervalMs?: number;
};

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Whether a drop contains at least one directory. Must be called synchronously
 * from the drop handler, while the DataTransfer is still live. Lets the UI show
 * the scanning indicator only for folder drops, instead of flashing it for a
 * two-file drop that resolves in a single frame.
 */
export function dataTransferHasDirectory(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.items ?? []).some((item) => {
    if (typeof item.webkitGetAsEntry !== "function") return false;
    return item.webkitGetAsEntry()?.isDirectory === true;
  });
}

export async function readDataTransferFiles(
  dataTransfer: DataTransfer,
  { signal, onProgress, progressIntervalMs = 120 }: ReadDataTransferOptions = {},
): Promise<File[]> {
  // Everything up to the first await must stay synchronous: the DataTransfer is
  // neutered once the drop handler returns, so the entries have to be claimed
  // inside the event tick.
  const items = Array.from(dataTransfer.items ?? []);
  const supportsEntries =
    items.length > 0 && typeof items[0].webkitGetAsEntry === "function";

  if (!supportsEntries) {
    return Array.from(dataTransfer.files ?? []);
  }

  const entries = items
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry != null);

  if (entries.length === 0) {
    return Array.from(dataTransfer.files ?? []);
  }

  const progress: ScanProgress = {
    files: 0,
    bytes: 0,
    skippedHidden: 0,
    currentPath: null,
  };
  let lastEmit = 0;

  const emit = (force = false) => {
    if (!onProgress) return;
    const now = Date.now();
    if (!force && now - lastEmit < progressIntervalMs) return;
    lastEmit = now;
    onProgress({ ...progress });
  };

  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw new DOMException("Folder scan cancelled", "AbortError");
    }
  };

  const readEntries = (
    reader: FileSystemDirectoryReader,
  ): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));

  const collected: File[] = [];

  const walk = async (entry: FileSystemEntry, parentPath = ""): Promise<void> => {
    throwIfAborted();
    const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

    if (entry.isFile) {
      if (isHiddenName(entry.name)) {
        progress.skippedHidden += 1;
        return;
      }
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) =>
        fileEntry.file(resolve, reject),
      );
      collected.push(withRelativePath(file, relativePath));
      progress.files += 1;
      progress.bytes += file.size;
      emit();
      return;
    }

    // Prune the whole subtree rather than descending and filtering per file —
    // this is what keeps a stray node_modules from pinning the tab.
    if (isIgnoredDirectoryName(entry.name)) {
      progress.skippedHidden += 1;
      return;
    }

    progress.currentPath = relativePath;
    emit();

    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    while (true) {
      throwIfAborted();
      const batch = await readEntries(dirReader);
      if (batch.length === 0) break;
      for (const child of batch) {
        await walk(child, relativePath);
      }
    }
  };

  try {
    for (const entry of entries) {
      await walk(entry);
    }
  } finally {
    progress.currentPath = null;
    emit(true);
  }

  return collected;
}
