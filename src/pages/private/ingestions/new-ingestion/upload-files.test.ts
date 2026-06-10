import { describe, expect, it } from "vitest";
import {
  collectAcceptedFiles,
  getFileExt,
  isSupportedFile,
  makeItemId,
} from "./upload-files";

function makeFile(name: string, size = 12) {
  const file = new File(["x"], name, {
    type: "text/plain",
    lastModified: 1234,
  });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("new ingestion upload file helpers", () => {
  it("normalizes file extensions", () => {
    expect(getFileExt("Report.PDF")).toBe("pdf");
    expect(getFileExt("archive")).toBe("archive");
  });

  it("detects supported files by extension", () => {
    expect(isSupportedFile(makeFile("notes.md"))).toBe(true);
    expect(isSupportedFile(makeFile("script.exe"))).toBe(false);
  });

  it("collects accepted files and counts skipped files", () => {
    const hugePdf = makeFile("huge.pdf", Number.MAX_SAFE_INTEGER);
    const result = collectAcceptedFiles([
      makeFile("policy.pdf"),
      makeFile("malware.exe"),
      hugePdf,
    ]);

    expect(result.accepted.map((file) => file.name)).toEqual(["policy.pdf"]);
    expect(result.skippedUnsupported).toBe(1);
    expect(result.skippedOversize).toBe(1);
  });

  it("uses stable identity fields for upload item ids", () => {
    expect(makeItemId(makeFile("policy.pdf"))).toBe("policy.pdf-12-1234");
  });
});
