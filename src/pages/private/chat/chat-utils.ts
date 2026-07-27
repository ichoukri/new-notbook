import type { TKnowledgeChatTurn } from "@/core/retrieval";

export type TChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export function buildKnowledgeChatHistory(
  messages: TChatHistoryMessage[],
  limit = 12,
): TKnowledgeChatTurn[] {
  const boundedLimit = Math.max(0, limit);
  if (boundedLimit === 0) return [];

  return messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-boundedLimit);
}

/**
 * Only PDFs can be opened in the in-app viewer; every other source file is
 * downloaded instead, so the cited filename decides which action the source
 * card offers.
 */
export function isPdfSourceFile(filename: string): boolean {
  return filename.trim().toLocaleLowerCase().endsWith(".pdf");
}

export function getCitationFolder(
  paths: string[],
  filename: string,
): string {
  const canonical = paths[0]?.trim();
  if (!canonical) return "Folder not recorded";

  const separator = canonical.lastIndexOf("/");
  if (separator < 0) return "Knowledge base root";

  const folder = canonical.slice(0, separator).trim();
  if (!folder || canonical.slice(separator + 1) !== filename) {
    return folder || "Knowledge base root";
  }
  return folder;
}
