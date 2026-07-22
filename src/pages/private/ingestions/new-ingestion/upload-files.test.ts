import { describe, expect, it, vi } from "vitest";
import {
  buildUploadFileMetadata,
  collectAcceptedFiles,
  dataTransferHasDirectory,
  getFileRelativePath,
  getFileExt,
  hasIgnoredPathSegment,
  isAbortError,
  isMacOSSidecar,
  isSupportedFile,
  makeItemId,
  normalizeRelativePath,
  readDataTransferFiles,
  type ScanProgress,
} from "./upload-files";

function makeFile(name: string, size = 12, relativePath = "") {
  const file = new File(["x"], name, {
    type: "text/plain",
    lastModified: 1234,
  });
  Object.defineProperty(file, "size", { value: size });
  if (relativePath) {
    Object.defineProperty(file, "webkitRelativePath", {
      configurable: true,
      value: relativePath,
    });
  }
  return file;
}

function makeFileEntry(file: File): FileSystemFileEntry {
  return {
    isFile: true,
    isDirectory: false,
    name: file.name,
    file: (success: FileCallback) => success(file),
  } as FileSystemFileEntry;
}

function makeDirectoryEntry(
  name: string,
  children: FileSystemEntry[],
): FileSystemDirectoryEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let emitted = false;
      return {
        readEntries: (success: FileSystemEntriesCallback) => {
          success(emitted ? [] : children);
          emitted = true;
        },
      } as FileSystemDirectoryReader;
    },
  } as FileSystemDirectoryEntry;
}

describe("new ingestion upload file helpers", () => {
  it("normalizes file extensions", () => {
    expect(getFileExt("Report.PDF")).toBe("pdf");
    expect(getFileExt("archive")).toBe("archive");
  });

  it("detects supported files by extension", () => {
    expect(isSupportedFile(makeFile("notes.md"))).toBe(true);
    expect(isSupportedFile(makeFile("drawing.TIFF"))).toBe(true);
    expect(isSupportedFile(makeFile("photo.jpeg"))).toBe(true);
    expect(isSupportedFile(makeFile("script.exe"))).toBe(false);
  });

  it("normalizes and preserves browser folder-relative paths", () => {
    expect(normalizeRelativePath("Grinding\\Manuals\\Guide.PDF")).toBe(
      "Grinding/Manuals/Guide.PDF",
    );
    expect(normalizeRelativePath("Guide.PDF")).toBeNull();
    expect(normalizeRelativePath("Grinding/../Guide.PDF")).toBeNull();

    const file = makeFile(
      "Guide.PDF",
      12,
      "Grinding/Manuals/Guide.PDF",
    );
    expect(getFileRelativePath(file)).toBe("Grinding/Manuals/Guide.PDF");
    expect(buildUploadFileMetadata(file)).toEqual({
      filename: "Guide.PDF",
      source_relative_path: "Grinding/Manuals/Guide.PDF",
      file_size: 12,
      content_type: "text/plain",
    });
  });

  it("filters macOS sidecars separately from unsupported and oversized files", () => {
    const hugePdf = makeFile("huge.pdf", Number.MAX_SAFE_INTEGER);
    const result = collectAcceptedFiles([
      makeFile("policy.pdf"),
      makeFile("._policy.pdf"),
      makeFile("malware.exe"),
      hugePdf,
    ]);

    expect(result.accepted.map((file) => file.name)).toEqual(["policy.pdf"]);
    expect(result.skippedMacOSSidecars).toBe(1);
    expect(result.skippedUnsupported).toBe(1);
    expect(result.skippedOversize).toBe(1);
    expect(isMacOSSidecar(makeFile("._manual.pdf"))).toBe(true);
  });

  it("uses relative paths in stable upload item ids", () => {
    expect(makeItemId(makeFile("policy.pdf"))).toBe("policy.pdf-12-1234");
    expect(
      makeItemId(makeFile("policy.pdf", 12, "folder-a/policy.pdf")),
    ).toBe("folder-a/policy.pdf-12-1234");
    expect(
      makeItemId(makeFile("policy.pdf", 12, "folder-b/policy.pdf")),
    ).not.toBe(
      makeItemId(makeFile("policy.pdf", 12, "folder-a/policy.pdf")),
    );
  });

  it("retains nested paths when a directory is dragged in", async () => {
    const manual = makeFile("manual.pdf");
    const entries = makeDirectoryEntry("Grinding", [
      makeDirectoryEntry("Manuals", [makeFileEntry(manual)]),
    ]);
    const dataTransfer = {
      files: [],
      items: [{ webkitGetAsEntry: () => entries }],
    } as unknown as DataTransfer;

    const files = await readDataTransferFiles(dataTransfer);

    expect(files).toHaveLength(1);
    expect(files[0]).toBe(manual);
    expect(getFileRelativePath(files[0])).toBe(
      "Grinding/Manuals/manual.pdf",
    );
  });

  it("treats hidden and system paths as ignorable", () => {
    expect(hasIgnoredPathSegment(makeFile(".DS_Store"))).toBe(true);
    expect(hasIgnoredPathSegment(makeFile("policy.pdf"))).toBe(false);
    expect(
      hasIgnoredPathSegment(makeFile("a.pdf", 12, "proj/node_modules/a.pdf")),
    ).toBe(true);
    expect(
      hasIgnoredPathSegment(makeFile("a.pdf", 12, "proj/.git/a.pdf")),
    ).toBe(true);
    expect(
      hasIgnoredPathSegment(makeFile("a.pdf", 12, "proj/__pycache__/a.pdf")),
    ).toBe(true);
    expect(
      hasIgnoredPathSegment(makeFile("a.pdf", 12, "proj/reports/a.pdf")),
    ).toBe(false);
    // A dotted folder anywhere in the chain disqualifies the file.
    expect(
      hasIgnoredPathSegment(makeFile("a.pdf", 12, "proj/.venv/lib/a.pdf")),
    ).toBe(true);
  });

  it("counts hidden files separately from unsupported ones", () => {
    const result = collectAcceptedFiles([
      makeFile("policy.pdf"),
      makeFile(".DS_Store"),
      makeFile("a.pdf", 12, "proj/node_modules/a.pdf"),
      makeFile("malware.exe"),
    ]);

    expect(result.accepted.map((file) => file.name)).toEqual(["policy.pdf"]);
    expect(result.skippedHidden).toBe(2);
    expect(result.skippedUnsupported).toBe(1);
    expect(result.skippedMacOSSidecars).toBe(0);
  });

  it("prunes ignored directories during the drag walk", async () => {
    const keeper = makeFile("manual.pdf");
    const buried = makeFile("buried.pdf");
    const hiddenFile = makeFile(".hidden.pdf");

    const root = makeDirectoryEntry("Project", [
      makeFileEntry(keeper),
      makeFileEntry(hiddenFile),
      makeDirectoryEntry("node_modules", [makeFileEntry(buried)]),
      makeDirectoryEntry(".git", [makeFileEntry(buried)]),
    ]);
    const dataTransfer = {
      files: [],
      items: [{ webkitGetAsEntry: () => root }],
    } as unknown as DataTransfer;

    const files = await readDataTransferFiles(dataTransfer);

    expect(files.map((file) => file.name)).toEqual(["manual.pdf"]);
  });

  it("detects whether a drop contains a directory", () => {
    const withFolder = {
      items: [{ webkitGetAsEntry: () => makeDirectoryEntry("Docs", []) }],
    } as unknown as DataTransfer;
    const filesOnly = {
      items: [{ webkitGetAsEntry: () => makeFileEntry(makeFile("a.pdf")) }],
    } as unknown as DataTransfer;

    expect(dataTransferHasDirectory(withFolder)).toBe(true);
    expect(dataTransferHasDirectory(filesOnly)).toBe(false);
  });

  it("reports scan progress and finishes with a cleared path", async () => {
    const root = makeDirectoryEntry("Docs", [
      makeFileEntry(makeFile("a.pdf", 100)),
      makeFileEntry(makeFile("b.pdf", 200)),
    ]);
    const dataTransfer = {
      files: [],
      items: [{ webkitGetAsEntry: () => root }],
    } as unknown as DataTransfer;

    const updates: ScanProgress[] = [];
    await readDataTransferFiles(dataTransfer, {
      progressIntervalMs: 0,
      onProgress: (progress) => updates.push(progress),
    });

    const final = updates.at(-1);
    expect(final?.files).toBe(2);
    expect(final?.bytes).toBe(300);
    expect(final?.currentPath).toBeNull();
    expect(updates.some((update) => update.currentPath === "Docs")).toBe(true);
  });

  it("rejects with an AbortError when the scan is cancelled", async () => {
    const onProgress = vi.fn();
    const root = makeDirectoryEntry("Docs", [
      makeFileEntry(makeFile("a.pdf")),
    ]);
    const dataTransfer = {
      files: [],
      items: [{ webkitGetAsEntry: () => root }],
    } as unknown as DataTransfer;

    const controller = new AbortController();
    controller.abort();

    await expect(
      readDataTransferFiles(dataTransfer, {
        signal: controller.signal,
        onProgress,
      }),
    ).rejects.toSatisfy(isAbortError);
  });
});
