import { describe, expect, it } from "vitest";
import {
  buildKnowledgeChatHistory,
  getCitationFolder,
  isPdfSourceFile,
} from "./chat-utils";

describe("knowledge chat helpers", () => {
  it("keeps only the latest non-empty conversation turns", () => {
    const history = buildKnowledgeChatHistory(
      [
        { role: "user", content: " first " },
        { role: "assistant", content: "answer" },
        { role: "user", content: "   " },
        { role: "user", content: "follow-up" },
      ],
      2,
    );

    expect(history).toEqual([
      { role: "assistant", content: "answer" },
      { role: "user", content: "follow-up" },
    ]);
  });

  it("shows the exact parent folder for a cited file", () => {
    expect(
      getCitationFolder(
        ["1-Grinding 1/6210-ML-2175/Procedures/manual.pdf"],
        "manual.pdf",
      ),
    ).toBe("1-Grinding 1/6210-ML-2175/Procedures");
  });

  it("treats only pdf sources as viewable, whatever the case", () => {
    expect(isPdfSourceFile("manual.pdf")).toBe(true);
    expect(isPdfSourceFile("Manual.PDF ")).toBe(true);
    expect(isPdfSourceFile("records.csv")).toBe(false);
    expect(isPdfSourceFile("pdf-notes.docx")).toBe(false);
    expect(isPdfSourceFile("")).toBe(false);
  });
});
