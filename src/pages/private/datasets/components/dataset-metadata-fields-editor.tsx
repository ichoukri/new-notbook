import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_DATASET_METADATA_FIELD,
  toggleDatasetMetadataFieldValueKind,
  type DatasetMetadataField,
} from "./dataset-agent-profile";

export function DatasetMetadataFieldsEditor({
  fields,
  onChange,
}: {
  fields: DatasetMetadataField[];
  onChange: (fields: DatasetMetadataField[]) => void;
}) {
  const updateFieldAt = (
    index: number,
    updater: (field: DatasetMetadataField) => DatasetMetadataField,
  ) => {
    onChange(
      fields.map((field, currentIndex) =>
        currentIndex === index ? updater(field) : field,
      ),
    );
  };

  const updateKey = (index: number, key: string) =>
    updateFieldAt(index, (field) => ({ ...field, key }));

  const updateValue = (index: number, value: string) =>
    updateFieldAt(index, (field) => ({ ...field, value }));

  const toggleMode = (index: number) =>
    updateFieldAt(index, toggleDatasetMetadataFieldValueKind);

  const addField = () =>
    onChange([...fields, { ...EMPTY_DATASET_METADATA_FIELD }]);

  const removeField = (index: number) =>
    onChange(fields.filter((_, currentIndex) => currentIndex !== index));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Metadata
        </Label>
        <span className="text-[11px] text-gray-400">
          Optional key-value pairs
        </span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_20px] gap-2 px-0.5">
          <span className="pl-1 text-[11px] font-medium text-gray-400">
            Key
          </span>
          <span className="pl-1 text-[11px] font-medium text-gray-400">
            Value
          </span>
        </div>

        {fields.map((field, index) => {
          const isJson = field.valueKind !== "string";
          // A field that already existed with a structured (non-string)
          // value can't be toggled: its shape is enforced on save so an
          // automation-owned value can't be silently flattened to a string.
          const canToggleMode = field.originalValueKind === undefined;

          return (
            <div key={index} className="space-y-1">
              <div className="grid grid-cols-[1fr_1fr_28px] items-start gap-2">
                <Input
                  value={field.key}
                  onChange={(event) => updateKey(index, event.target.value)}
                  placeholder="e.g. owner"
                  className="h-9 rounded-lg text-sm"
                />
                {isJson ? (
                  <Textarea
                    value={field.value}
                    onChange={(event) =>
                      updateValue(index, event.target.value)
                    }
                    placeholder='{"key": "value"}'
                    rows={2}
                    className="rounded-lg font-mono text-xs"
                  />
                ) : (
                  <Input
                    value={field.value}
                    onChange={(event) =>
                      updateValue(index, event.target.value)
                    }
                    placeholder="e.g. research-team"
                    className="h-9 rounded-lg text-sm"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  disabled={fields.length === 1}
                  aria-label="Remove metadata field"
                  className="flex size-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {canToggleMode && (
                <button
                  type="button"
                  onClick={() => toggleMode(index)}
                  className="pl-1 text-[11px] font-medium text-gray-400 transition-colors hover:text-indigo-600"
                >
                  {isJson ? "Switch to text value" : "Use JSON value"}
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addField}
          className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
        >
          <Plus className="size-3.5" />
          Add field
        </button>
      </div>
    </div>
  );
}
