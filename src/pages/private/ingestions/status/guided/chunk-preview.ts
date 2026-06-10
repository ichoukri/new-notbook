import {
  type TChunkEditOperation,
  type TIngestionChunk,
  getChunkImageUrls,
} from "@/core/ingestions";

export type PreviewStatus =
  | "unchanged"
  | "edited"
  | "added"
  | "merged"
  | "deleted";

export type PreviewChunk = {
  key: string;
  serverId: string | null;
  status: PreviewStatus;
  displayIndex: number;
  pageNumber: number | null;
  charCount: number;
  contentTypes: string[];
  imageUrls: string[];
  content: string;
};

export const PREVIEW_STATUS_BADGE: Record<
  Exclude<PreviewStatus, "unchanged">,
  { label: string; className: string }
> = {
  edited: { label: "Edited", className: "bg-violet-100 text-violet-700" },
  added: { label: "New", className: "bg-emerald-100 text-emerald-700" },
  merged: { label: "Merged", className: "bg-emerald-100 text-emerald-700" },
  deleted: { label: "Removed", className: "bg-red-100 text-red-600" },
};

export function splitIntoBlocks(text: string): string[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;
  const lines = trimmed
    .split(/\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return lines.length > 1 ? lines : [trimmed];
}

export function opTouches(op: TChunkEditOperation, id: string): boolean {
  return op.op === "merge" ? op.chunk_ids.includes(id) : op.chunk_id === id;
}

export function buildChunkPreview(
  chunks: TIngestionChunk[],
  ops: TChunkEditOperation[],
  showSummary: boolean,
): PreviewChunk[] {
  const contentOf = (chunk: TIngestionChunk) =>
    (showSummary ? chunk.summaryContent : chunk.textContent) ?? "";
  const indexOf = new Map(chunks.map((chunk, index) => [chunk.id, index]));

  const editText = new Map<string, string>();
  const deleteIds = new Set<string>();
  const splitSegs = new Map<string, string[]>();
  const mergeAnchor = new Map<string, string[]>();
  const mergeConsumed = new Set<string>();

  for (const op of ops) {
    if (op.op === "edit") {
      editText.set(
        op.chunk_id,
        (showSummary ? op.summary_content : op.text_content) ?? "",
      );
    } else if (op.op === "delete") {
      deleteIds.add(op.chunk_id);
    } else if (op.op === "split") {
      splitSegs.set(op.chunk_id, op.segments);
    } else if (op.op === "merge") {
      const ordered = [...op.chunk_ids].sort(
        (a, b) => (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0),
      );
      mergeAnchor.set(ordered[0], ordered);
      ordered.slice(1).forEach((id) => mergeConsumed.add(id));
    }
  }

  const rows: PreviewChunk[] = [];
  for (const chunk of chunks) {
    const id = chunk.id;
    if (mergeConsumed.has(id)) continue;

    if (mergeAnchor.has(id)) {
      const ids = mergeAnchor.get(id)!;
      const members = ids.map((memberId) => chunks[indexOf.get(memberId)!]);
      rows.push({
        key: `merge:${ids.join("+")}`,
        serverId: null,
        status: "merged",
        displayIndex: 0,
        pageNumber: members[0]?.pageNumber ?? null,
        charCount: members.reduce((sum, member) => sum + contentOf(member).length, 0),
        contentTypes: [...new Set(members.flatMap((member) => member.contentTypes ?? []))],
        imageUrls: members.flatMap((member) => getChunkImageUrls(member)),
        content: members.map((member) => contentOf(member)).join("\n\n"),
      });
      continue;
    }

    if (splitSegs.has(id)) {
      const segments = splitSegs.get(id)!;
      segments.forEach((segment, segmentIndex) =>
        rows.push({
          key: `split:${id}:${segmentIndex}`,
          serverId: null,
          status: "added",
          displayIndex: 0,
          pageNumber: chunk.pageNumber ?? null,
          charCount: segment.length,
          contentTypes: segmentIndex === 0 ? (chunk.contentTypes ?? []) : [],
          imageUrls: segmentIndex === 0 ? getChunkImageUrls(chunk) : [],
          content: segment,
        }),
      );
      continue;
    }

    const isDeleted = deleteIds.has(id);
    const isEdited = editText.has(id);
    const content = isEdited ? editText.get(id)! : contentOf(chunk);
    rows.push({
      key: id,
      serverId: id,
      status: isDeleted ? "deleted" : isEdited ? "edited" : "unchanged",
      displayIndex: 0,
      pageNumber: chunk.pageNumber ?? null,
      charCount: content.length,
      contentTypes: chunk.contentTypes ?? [],
      imageUrls: getChunkImageUrls(chunk),
      content,
    });
  }

  let displayIndex = 0;
  for (const row of rows) {
    row.displayIndex = row.status === "deleted" ? -1 : displayIndex++;
  }
  return rows;
}
