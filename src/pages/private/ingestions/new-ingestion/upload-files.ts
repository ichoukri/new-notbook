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

export type CollectResult = {
  accepted: File[];
  skippedMacOSSidecars: number;
  skippedUnsupported: number;
  skippedOversize: number;
};

export function getFileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
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
  let skippedUnsupported = 0;
  let skippedOversize = 0;
  for (const file of files) {
    if (isMacOSSidecar(file)) {
      skippedMacOSSidecars += 1;
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
    skippedUnsupported,
    skippedOversize,
  };
}

export async function readDataTransferFiles(
  dataTransfer: DataTransfer,
): Promise<File[]> {
  const items = Array.from(dataTransfer.items ?? []);
  const supportsEntries =
    items.length > 0 && typeof items[0].webkitGetAsEntry === "function";

  if (!supportsEntries) {
    return Array.from(dataTransfer.files ?? []);
  }

  const readEntries = (
    reader: FileSystemDirectoryReader,
  ): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));

  const walk = async (
    entry: FileSystemEntry,
    parentPath = "",
  ): Promise<File[]> => {
    const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) =>
        fileEntry.file(resolve, reject),
      );
      return [withRelativePath(file, relativePath)];
    }
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const collected: File[] = [];
    while (true) {
      const batch = await readEntries(dirReader);
      if (batch.length === 0) break;
      for (const child of batch) {
        collected.push(...(await walk(child, relativePath)));
      }
    }
    return collected;
  };

  const entries = items
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry != null);

  if (entries.length === 0) {
    return Array.from(dataTransfer.files ?? []);
  }

  const nested = await Promise.all(entries.map((entry) => walk(entry)));
  return nested.flat();
}
