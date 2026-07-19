export type TGraphCandidateKind = "entity" | "relation";

export type TGraphCandidateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "published";

export type TGraphEvidence = {
  text: string;
  pageNumber: number | null;
  chunkId: string | null;
};

export type TGraphRun = {
  id: string;
  status: string;
  chunkVersion: number | null;
  ontologyVersion: string | null;
  extractorModel: string | null;
  completedAt: string | null;
  stats: Record<string, unknown>;
};

type TGraphCandidateBase = {
  id: string;
  kind: TGraphCandidateKind;
  status: TGraphCandidateStatus;
  confidence: number;
  description: string | null;
  pageNumber: number | null;
  evidence: TGraphEvidence[];
  chunkId: string | null;
};

export type TGraphEntityCandidate = TGraphCandidateBase & {
  kind: "entity";
  canonicalId: string;
  name: string;
  entityType: string;
  aliases: string[];
};

export type TGraphRelationCandidate = TGraphCandidateBase & {
  kind: "relation";
  sourceCanonicalId: string;
  targetCanonicalId: string;
  sourceName: string;
  targetName: string;
  relationType: string;
};

export type TGraphCandidate =
  | TGraphEntityCandidate
  | TGraphRelationCandidate;

export type TGraphCandidatePage<T extends TGraphCandidate> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function getNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (
      typeof value !== "number" &&
      (typeof value !== "string" || !value.trim())
    ) {
      continue;
    }
    const parsed = typeof value === "number" ? value : Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getPageNumber(...values: unknown[]): number | null {
  const page = getNumber(...values);
  return page !== null && page >= 1 ? Math.trunc(page) : null;
}

function getStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => getString(item))
        .filter((item): item is string => item !== null),
    ),
  );
}

function normalizeStatus(value: unknown): TGraphCandidateStatus {
  const status = (getString(value) ?? "pending").toLowerCase();
  if (status === "approved" || status === "accepted") return "approved";
  if (status === "rejected" || status === "declined") return "rejected";
  if (status === "published") return "published";
  // Unknown review states fail closed: the UI keeps Publish disabled until the
  // backend confirms there are no pending rows.
  return "pending";
}

function normalizeConfidence(value: unknown): number {
  const raw = getNumber(value) ?? 0;
  const normalized = raw > 1 && raw <= 100 ? raw / 100 : raw;
  return Math.max(0, Math.min(1, normalized));
}

function parseEvidence(
  value: unknown,
  fallbackPage: number | null,
  fallbackChunkId: string | null,
): TGraphEvidence[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const parsed = values
    .map((item): TGraphEvidence | null => {
      if (typeof item === "string") {
        const text = item.trim();
        return text
          ? { text, pageNumber: fallbackPage, chunkId: fallbackChunkId }
          : null;
      }
      const record = getRecord(item);
      if (!record) return null;
      const text = getString(
        record.text,
        record.evidence_text,
        record.quote,
        record.snippet,
        record.content,
      );
      if (!text) return null;
      return {
        text,
        pageNumber:
          getPageNumber(record.page_number, record.page) ?? fallbackPage,
        chunkId: getString(record.chunk_id) ?? fallbackChunkId,
      };
    })
    .filter((item): item is TGraphEvidence => item !== null);

  const seen = new Set<string>();
  return parsed.filter((item) => {
    const key = `${item.text}\u001f${item.pageNumber ?? ""}\u001f${item.chunkId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unwrapRecord(value: unknown): Record<string, unknown> | null {
  const direct = getRecord(value);
  if (!direct) return null;
  for (const key of ["data", "run", "latest_run", "result"]) {
    const nested = getRecord(direct[key]);
    if (nested) return nested;
  }
  return direct;
}

export function parseGraphRun(value: unknown): TGraphRun | null {
  const record = unwrapRecord(value);
  if (!record) return null;
  const id = getString(record.id, record.run_id);
  if (!id) return null;

  return {
    id,
    status: (getString(record.status) ?? "unknown").toLowerCase(),
    chunkVersion: getNumber(record.chunk_version, record.chunkVersion),
    ontologyVersion: getString(
      record.ontology_version,
      record.ontologyVersion,
    ),
    extractorModel: getString(record.extractor_model, record.extractorModel),
    completedAt: getString(record.completed_at, record.completedAt),
    stats: getRecord(record.stats) ?? {},
  };
}

function parseEntity(value: unknown): TGraphEntityCandidate | null {
  const record = getRecord(value);
  if (!record) return null;
  const id = getString(record.id, record.candidate_id);
  if (!id) return null;
  const canonicalId =
    getString(record.canonical_id, record.canonicalId) ?? id;
  const pageNumber = getPageNumber(record.page_number, record.pageNumber);
  const chunkId = getString(record.chunk_id, record.chunkId);

  return {
    id,
    kind: "entity",
    canonicalId,
    name: getString(record.name, record.label) ?? canonicalId,
    entityType:
      getString(record.entity_type, record.entityType, record.type) ??
      "Unknown",
    aliases: getStrings(record.aliases),
    status: normalizeStatus(record.status ?? record.review_status),
    confidence: normalizeConfidence(record.confidence),
    description: getString(record.description),
    pageNumber,
    evidence: parseEvidence(
      record.evidence ?? record.evidence_text,
      pageNumber,
      chunkId,
    ),
    chunkId,
  };
}

function parseRelation(value: unknown): TGraphRelationCandidate | null {
  const record = getRecord(value);
  if (!record) return null;
  const id = getString(record.id, record.candidate_id);
  if (!id) return null;
  const sourceCanonicalId =
    getString(record.source_canonical_id, record.sourceCanonicalId) ??
    "Unknown source";
  const targetCanonicalId =
    getString(record.target_canonical_id, record.targetCanonicalId) ??
    "Unknown target";
  const pageNumber = getPageNumber(record.page_number, record.pageNumber);
  const chunkId = getString(record.chunk_id, record.chunkId);

  return {
    id,
    kind: "relation",
    sourceCanonicalId,
    targetCanonicalId,
    sourceName:
      getString(record.source_name, record.sourceName) ?? sourceCanonicalId,
    targetName:
      getString(record.target_name, record.targetName) ?? targetCanonicalId,
    relationType:
      getString(record.relation_type, record.relationType, record.type) ??
      "RELATED_TO",
    status: normalizeStatus(record.status ?? record.review_status),
    confidence: normalizeConfidence(record.confidence),
    description: getString(record.description),
    pageNumber,
    evidence: parseEvidence(
      record.evidence ?? record.evidence_text,
      pageNumber,
      chunkId,
    ),
    chunkId,
  };
}

function getPageEnvelope(value: unknown): {
  record: Record<string, unknown> | null;
  rawItems: unknown[];
} {
  if (Array.isArray(value)) return { record: null, rawItems: value };
  const direct = getRecord(value);
  if (!direct) return { record: null, rawItems: [] };
  const nested = getRecord(direct.data);
  const record = nested && Array.isArray(nested.items) ? nested : direct;
  const rawItems =
    [record.items, record.candidates, record.results, direct.data].find(
      Array.isArray,
    ) ?? [];
  return { record, rawItems };
}

function parseCandidatePage<T extends TGraphCandidate>(
  value: unknown,
  parser: (item: unknown) => T | null,
  fallbackOffset: number,
  fallbackLimit: number,
): TGraphCandidatePage<T> {
  const { record, rawItems } = getPageEnvelope(value);
  const items = rawItems
    .map(parser)
    .filter((item): item is T => item !== null);
  const total = Math.max(
    items.length,
    Math.trunc(
      getNumber(record?.total, record?.total_count, record?.count) ??
        items.length,
    ),
  );
  const offset = Math.max(
    0,
    Math.trunc(getNumber(record?.offset) ?? fallbackOffset),
  );
  const limit = Math.max(
    1,
    Math.trunc(getNumber(record?.limit) ?? fallbackLimit),
  );
  return { items, total, offset, limit };
}

export function parseGraphEntityPage(
  value: unknown,
  fallbackOffset = 0,
  fallbackLimit = 20,
): TGraphCandidatePage<TGraphEntityCandidate> {
  return parseCandidatePage(
    value,
    parseEntity,
    fallbackOffset,
    fallbackLimit,
  );
}

export function parseGraphRelationPage(
  value: unknown,
  fallbackOffset = 0,
  fallbackLimit = 20,
): TGraphCandidatePage<TGraphRelationCandidate> {
  return parseCandidatePage(
    value,
    parseRelation,
    fallbackOffset,
    fallbackLimit,
  );
}

export function formatGraphType(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
