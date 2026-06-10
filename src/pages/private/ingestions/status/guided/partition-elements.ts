export type PartitionElement = {
  index: number;
  type: string;
  page: number | null;
  char_count: number;
  preview: string;
  has_image: boolean;
  has_table: boolean;
  table_html: string | null;
  image_path: string | null;
};

export function parsePartitionElements(value: unknown): PartitionElement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      if (typeof record.index !== "number") return null;
      return {
        index: record.index,
        type: typeof record.type === "string" ? record.type : "Element",
        page: typeof record.page === "number" ? record.page : null,
        char_count:
          typeof record.char_count === "number" ? record.char_count : 0,
        preview: typeof record.preview === "string" ? record.preview : "",
        has_image: record.has_image === true,
        has_table: record.has_table === true,
        table_html:
          typeof record.table_html === "string" ? record.table_html : null,
        image_path:
          typeof record.image_path === "string" ? record.image_path : null,
      } satisfies PartitionElement;
    })
    .filter((item): item is PartitionElement => item !== null);
}
