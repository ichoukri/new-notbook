import { describe, expect, it } from "vitest";
import {
  buildCreateDatasetMetadata,
  buildDatasetCustomMetadata,
  buildDatasetMetadataUpdate,
  DatasetMetadataValidationError,
  getDatasetAgentProfile,
  hasDatasetCustomMetadataChanges,
  toDatasetMetadataFields,
  toggleDatasetMetadataFieldValueKind,
  withDatasetAgentProfile,
} from "./dataset-agent-profile";

describe("dataset agent profile metadata", () => {
  it("defaults missing and unknown values to generic", () => {
    expect(getDatasetAgentProfile(null)).toBe("generic");
    expect(getDatasetAgentProfile({ agent_profile: "unknown" })).toBe("generic");
  });

  it("recognizes maintenance and preserves unrelated metadata", () => {
    expect(getDatasetAgentProfile({ agent_profile: "maintenance" })).toBe(
      "maintenance",
    );
    expect(withDatasetAgentProfile({ owner: "ops" }, "maintenance")).toEqual({
      owner: "ops",
      agent_profile: "maintenance",
    });
  });

  it("builds create metadata with string fields and the selected profile", () => {
    expect(
      buildCreateDatasetMetadata(
        [
          { key: " owner ", value: "ops", valueKind: "string" },
          {
            key: "agent_profile",
            value: "generic",
            valueKind: "string",
          },
        ],
        "maintenance",
      ),
    ).toEqual({ owner: "ops", agent_profile: "maintenance" });
  });

  it("preserves arrays, objects, booleans, numbers and null exactly", () => {
    const metadata = {
      versions: [{ event: "document_added", details: { page_count: 4 } }],
      procedures: [{ name: "inspection", steps: [1, 2, 3] }],
      configuration: { locale: "fr", enabled: true },
      reviewed: false,
      priority: 3,
      empty: null,
      stringThatLooksTyped: "true",
      agent_profile: "generic",
    };

    const fields = toDatasetMetadataFields(metadata);
    const rebuilt = buildDatasetCustomMetadata(fields);

    expect(fields.some((field) => field.key === "versions")).toBe(false);
    expect(fields.some((field) => field.key === "agent_profile")).toBe(false);
    expect(rebuilt).toEqual({
      procedures: metadata.procedures,
      configuration: metadata.configuration,
      reviewed: false,
      priority: 3,
      empty: null,
      stringThatLooksTyped: "true",
    });
    expect(Array.isArray(rebuilt.procedures)).toBe(true);
    expect(typeof rebuilt.configuration).toBe("object");
    expect(typeof rebuilt.reviewed).toBe("boolean");
    expect(typeof rebuilt.priority).toBe("number");
    expect(rebuilt.empty).toBeNull();
    expect(rebuilt.stringThatLooksTyped).toBe("true");
  });

  it("parses edited structured metadata back to its original kind", () => {
    const fields = toDatasetMetadataFields({
      procedures: [{ name: "old" }],
      reviewed: false,
      priority: 3,
    });
    fields.find((field) => field.key === "procedures")!.value =
      '[{"name":"new"}]';
    fields.find((field) => field.key === "reviewed")!.value = "true";
    fields.find((field) => field.key === "priority")!.value = "4";

    expect(buildDatasetCustomMetadata(fields)).toEqual({
      procedures: [{ name: "new" }],
      reviewed: true,
      priority: 4,
    });
  });

  it("detects custom metadata changes independently from the agent profile", () => {
    const metadata = {
      versions: [{ event: "document_added" }],
      configuration: { enabled: true },
      agent_profile: "generic",
    };
    const fields = toDatasetMetadataFields(metadata);

    expect(hasDatasetCustomMetadataChanges(fields, metadata)).toBe(false);
    expect(buildDatasetMetadataUpdate(fields, metadata)).toBeUndefined();
    expect(buildDatasetCustomMetadata(fields)).toEqual({
      configuration: metadata.configuration,
    });

    fields.find((field) => field.key === "configuration")!.value =
      '{"enabled":false}';
    expect(hasDatasetCustomMetadataChanges(fields, metadata)).toBe(true);
    expect(buildDatasetMetadataUpdate(fields, metadata)).toEqual({
      configuration: { enabled: false },
    });
  });

  it("sends an empty snapshot when the user deletes the last custom key", () => {
    const metadata = {
      versions: [{ event: "document_added" }],
      agent_profile: "generic",
      owner: "reliability",
    };
    const fields = toDatasetMetadataFields(metadata);
    fields[0].key = "";

    expect(buildDatasetMetadataUpdate(fields, metadata)).toEqual({});
  });

  it("rejects malformed JSON and accidental structured-value type changes", () => {
    const malformed = toDatasetMetadataFields({ procedures: [{ name: "old" }] });
    malformed[0].value = "not-json";

    expect(() => buildDatasetCustomMetadata(malformed)).toThrow(
      DatasetMetadataValidationError,
    );

    const wrongKind = toDatasetMetadataFields({ configuration: { locale: "fr" } });
    wrongKind[0].value = '"now a string"';

    expect(() => buildDatasetCustomMetadata(wrongKind)).toThrow(
      'must remain object',
    );
  });

  it("lets a brand-new field hold a nested object value", () => {
    expect(
      buildCreateDatasetMetadata(
        [
          {
            key: "scientific_research",
            value: '{"state_values":[],"existing_keys":["arxiv:1"]}',
            valueKind: "object",
          },
        ],
        "generic",
      ),
    ).toEqual({
      scientific_research: { state_values: [], existing_keys: ["arxiv:1"] },
      agent_profile: "generic",
    });
  });

  it("lets a brand-new JSON field hold any JSON shape, not just objects", () => {
    expect(
      buildDatasetCustomMetadata([
        { key: "tags_extra", value: "[1,2,3]", valueKind: "object" },
      ]),
    ).toEqual({ tags_extra: [1, 2, 3] });

    expect(
      buildDatasetCustomMetadata([
        { key: "threshold", value: "42", valueKind: "object" },
      ]),
    ).toEqual({ threshold: 42 });
  });

  it("still guards an existing structured value against becoming a different shape", () => {
    const fields = toDatasetMetadataFields({
      scientific_research: { existing_keys: ["arxiv:1"] },
    });
    fields[0].value = "[1,2,3]";

    expect(() => buildDatasetCustomMetadata(fields)).toThrow(
      "must remain object",
    );
  });

  it("toggles a new field between text and JSON input modes", () => {
    const textField = {
      key: "owner",
      value: "ops",
      valueKind: "string" as const,
    };
    const jsonField = toggleDatasetMetadataFieldValueKind(textField);
    expect(jsonField.valueKind).toBe("object");
    expect(jsonField.value).toBe("ops");

    const emptyJsonField = toggleDatasetMetadataFieldValueKind({
      key: "owner",
      value: "",
      valueKind: "string",
    });
    expect(emptyJsonField.value).toBe("{}");

    const backToText = toggleDatasetMetadataFieldValueKind(jsonField);
    expect(backToText.valueKind).toBe("string");
  });

  it("rejects duplicate custom metadata keys", () => {
    expect(() =>
      buildCreateDatasetMetadata(
        [
          { key: "owner", value: "ops", valueKind: "string" },
          { key: " owner ", value: "other", valueKind: "string" },
        ],
        "generic",
      ),
    ).toThrow('Metadata key "owner" is duplicated.');
  });
});
