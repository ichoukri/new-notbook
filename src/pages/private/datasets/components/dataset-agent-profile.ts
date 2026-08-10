export type DatasetAgentProfile = "generic" | "maintenance";

const SYSTEM_METADATA_KEYS = new Set(["agent_profile", "versions"]);

export type DatasetMetadataValueKind =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

export type DatasetMetadataField = {
  key: string;
  value: string;
  /**
   * Existing non-string values are edited as JSON. Keeping their original kind
   * lets us reject invalid edits instead of silently turning structured
   * platform metadata (for example `versions`) into a string.
   */
  valueKind: DatasetMetadataValueKind;
  originalValue?: unknown;
  originalText?: string;
};

export const EMPTY_DATASET_METADATA_FIELD: DatasetMetadataField = {
  key: "",
  value: "",
  valueKind: "string",
};

export class DatasetMetadataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatasetMetadataValidationError";
  }
}

function metadataValueKind(value: unknown): DatasetMetadataValueKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  switch (typeof value) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "string";
  }
}

function metadataValueText(
  value: unknown,
  kind: DatasetMetadataValueKind,
): string {
  if (kind === "string") return String(value ?? "");
  return JSON.stringify(value);
}

export function toDatasetMetadataFields(
  metadata: Record<string, unknown> | null | undefined,
): DatasetMetadataField[] {
  const fields = Object.entries(metadata ?? {})
    .filter(([key]) => !SYSTEM_METADATA_KEYS.has(key))
    .map(([key, originalValue]) => {
      const valueKind = metadataValueKind(originalValue);
      const originalText = metadataValueText(originalValue, valueKind);

      return {
        key,
        value: originalText,
        valueKind,
        originalValue,
        originalText,
      } satisfies DatasetMetadataField;
    });

  return fields.length > 0 ? fields : [{ ...EMPTY_DATASET_METADATA_FIELD }];
}

function parseExistingMetadataValue(field: DatasetMetadataField): unknown {
  if (field.valueKind === "string") return field.value;

  // Avoid an unnecessary JSON round trip for an untouched value. This keeps
  // its exact in-memory representation and, more importantly, its JSON type.
  if (
    field.originalText === field.value &&
    Object.prototype.hasOwnProperty.call(field, "originalValue")
  ) {
    return field.originalValue;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(field.value);
  } catch {
    throw new DatasetMetadataValidationError(
      `Metadata value for "${field.key.trim() || "unnamed field"}" must be valid JSON (${field.valueKind}).`,
    );
  }

  const parsedKind = metadataValueKind(parsed);
  if (parsedKind !== field.valueKind) {
    throw new DatasetMetadataValidationError(
      `Metadata value for "${field.key.trim() || "unnamed field"}" must remain ${field.valueKind}.`,
    );
  }
  return parsed;
}

export function buildDatasetCustomMetadata(
  fields: DatasetMetadataField[],
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  for (const field of fields) {
    const key = field.key.trim();
    if (!key || SYSTEM_METADATA_KEYS.has(key)) continue;
    if (Object.prototype.hasOwnProperty.call(metadata, key)) {
      throw new DatasetMetadataValidationError(
        `Metadata key "${key}" is duplicated.`,
      );
    }
    metadata[key] = parseExistingMetadataValue(field);
  }

  return metadata;
}

function buildDatasetMetadata(
  fields: DatasetMetadataField[],
  profile: DatasetAgentProfile,
): Record<string, unknown> {
  return withDatasetAgentProfile(buildDatasetCustomMetadata(fields), profile);
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonValuesEqual(value, right[index]))
    );
  }
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        jsonValuesEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

export function hasDatasetCustomMetadataChanges(
  fields: DatasetMetadataField[],
  originalMetadata: Record<string, unknown> | null | undefined,
): boolean {
  const originalCustomMetadata = Object.fromEntries(
    Object.entries(originalMetadata ?? {}).filter(
      ([key]) => !SYSTEM_METADATA_KEYS.has(key),
    ),
  );
  return !jsonValuesEqual(
    buildDatasetCustomMetadata(fields),
    originalCustomMetadata,
  );
}

/** Build the custom-metadata snapshot only when a user actually changed it. */
export function buildDatasetMetadataUpdate(
  fields: DatasetMetadataField[],
  originalMetadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  const customMetadata = buildDatasetCustomMetadata(fields);
  if (!hasDatasetCustomMetadataChanges(fields, originalMetadata)) {
    return undefined;
  }
  return customMetadata;
}

/** New free-form metadata fields retain their established string semantics. */
export function buildCreateDatasetMetadata(
  fields: DatasetMetadataField[],
  profile: DatasetAgentProfile,
): Record<string, unknown> {
  return buildDatasetMetadata(fields, profile);
}

export function getDatasetAgentProfile(
  metadata: Record<string, unknown> | null | undefined,
): DatasetAgentProfile {
  return metadata?.agent_profile === "maintenance" ? "maintenance" : "generic";
}

export function withDatasetAgentProfile<T extends Record<string, unknown>>(
  metadata: T,
  profile: DatasetAgentProfile,
): T & { agent_profile: DatasetAgentProfile } {
  return { ...metadata, agent_profile: profile };
}
