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

// Detect a markdown table fragment (a run of pipe-rows).
function isTableText(text: string): boolean {
  const lines = text.split(/\n/).filter((line) => line.trim() !== "");
  return lines.length > 0 && lines.every((line) => line.trim().startsWith("|"));
}

// Split text into blocks while keeping a markdown table (consecutive pipe-rows)
// together as one block, so the user can't accidentally cut through the middle
// of a table when splitting. Splits on blank lines first, then walks each
// paragraph's lines grouping table rows together and other lines apart.
export function splitTextKeepingTables(text: string): string[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const paragraph of paragraphs) {
    const lines = paragraph
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      out.push(paragraph);
      continue;
    }
    let tableBuffer: string[] = [];
    const flush = () => {
      if (tableBuffer.length) {
        out.push(tableBuffer.join("\n"));
        tableBuffer = [];
      }
    };
    for (const line of lines) {
      if (line.startsWith("|")) tableBuffer.push(line);
      else {
        flush();
        out.push(line);
      }
    }
    flush();
  }
  return out;
}

export type SplitBlock =
  | { kind: "text"; text: string; isTable: boolean }
  | { kind: "image"; url: string };

// The ordered, atomic blocks shown in the split editor: text/table fragments
// followed by each image. Split points sit between these blocks, so images and
// tables move as whole units into a resulting chunk.
export function buildSplitBlocks(
  content: string,
  imageUrls: string[],
): SplitBlock[] {
  const blocks: SplitBlock[] = splitTextKeepingTables(content).map((text) => ({
    kind: "text",
    text,
    isTable: isTableText(text),
  }));
  for (const url of imageUrls) blocks.push({ kind: "image", url });
  return blocks;
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
  const splitOps = new Map<
    string,
    { segments: string[]; imageSegments?: number[] }
  >();
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
      splitOps.set(op.chunk_id, {
        segments: op.segments,
        imageSegments: op.image_segments,
      });
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

    if (splitOps.has(id)) {
      const { segments, imageSegments } = splitOps.get(id)!;
      const parentImages = getChunkImageUrls(chunk);
      const targetOf = (imageIndex: number) => {
        const target =
          imageSegments && imageIndex < imageSegments.length
            ? imageSegments[imageIndex]
            : 0;
        return target >= 0 && target < segments.length ? target : 0;
      };
      segments.forEach((segment, segmentIndex) => {
        const segmentImages = parentImages.filter(
          (_, imageIndex) => targetOf(imageIndex) === segmentIndex,
        );
        rows.push({
          key: `split:${id}:${segmentIndex}`,
          serverId: null,
          status: "added",
          displayIndex: 0,
          pageNumber: chunk.pageNumber ?? null,
          charCount: segment.length,
          contentTypes: segmentImages.length ? ["text", "image"] : ["text"],
          imageUrls: segmentImages,
          content: segment,
        });
      });
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
