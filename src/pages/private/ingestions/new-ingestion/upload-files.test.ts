import { describe, expect, it } from "vitest";
import {
  buildUploadFileMetadata,
  collectAcceptedFiles,
  getFileRelativePath,
  getFileExt,
  isMacOSSidecar,
  isSupportedFile,
  makeItemId,
  normalizeRelativePath,
  readDataTransferFiles,
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
});
