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
] as const;

export type CollectResult = {
  accepted: File[];
  skippedUnsupported: number;
  skippedOversize: number;
};

export function getFileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function makeItemId(file: File): string {
  return `${file.webkitRelativePath || file.name}-${file.size}-${file.lastModified}`;
}

export function isSupportedFile(file: File): boolean {
  const extension = `.${getFileExt(file.name)}`;
  return SUPPORTED_FILE_EXTENSIONS.includes(
    extension as (typeof SUPPORTED_FILE_EXTENSIONS)[number],
  );
}

export function collectAcceptedFiles(files: File[]): CollectResult {
  const accepted: File[] = [];
  let skippedUnsupported = 0;
  let skippedOversize = 0;
  for (const file of files) {
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
  return { accepted, skippedUnsupported, skippedOversize };
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

  const walk = async (entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) =>
        fileEntry.file(resolve, reject),
      );
      return [file];
    }
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const collected: File[] = [];
    while (true) {
      const batch = await readEntries(dirReader);
      if (batch.length === 0) break;
      for (const child of batch) collected.push(...(await walk(child)));
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
