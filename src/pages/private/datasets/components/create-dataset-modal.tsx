import { useState, type FormEvent } from "react";
import { Database, Loader2, Plus, Tag, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/core/api/error";
import type { CreateDatasetPayload } from "./dataset-page-types";

export function CreateDatasetModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateDatasetPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [metaFields, setMetaFields] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setTags("");
    setMetaFields([{ key: "", value: "" }]);
    setError("");
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  };

  const addField = () => {
    setMetaFields((fields) => [...fields, { key: "", value: "" }]);
  };

  const removeField = (index: number) => {
    setMetaFields((fields) =>
      fields.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const updateField = (
    index: number,
    column: "key" | "value",
    value: string,
  ) => {
    setMetaFields((fields) =>
      fields.map((field, currentIndex) =>
        currentIndex === index ? { ...field, [column]: value } : field,
      ),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Dataset name is required.");
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const metadataEntries = metaFields
      .map((field) => ({
        key: field.key.trim(),
        value: field.value.trim(),
      }))
      .filter((field) => field.key);

    const datasetMetadata =
      metadataEntries.length > 0
        ? Object.fromEntries(
            metadataEntries.map((field) => [field.key, field.value]),
          )
        : undefined;

    setIsSubmitting(true);
    setError("");

    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        dataset_metadata: datasetMetadata,
      });
      resetForm();
      onClose();
    } catch (createError) {
      setError(getApiErrorMessage(createError, "Could not create dataset."));
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Database className="size-4 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-base">
                Create New Dataset
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Set up a new dataset record in the backend
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Dataset Name
            </Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Product Documentation v3"
              className="rounded-xl h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the contents and purpose of this dataset..."
              rows={3}
              className="rounded-xl resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tags
              </Label>
              <span className="text-[11px] text-gray-400">
                Comma separated
              </span>
            </div>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <Input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="docs, api, sdk"
                className="rounded-xl h-10 pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Metadata
              </Label>
              <span className="text-[11px] text-gray-400">
                Optional key-value pairs
              </span>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_20px] gap-2 px-0.5">
                <span className="text-[11px] font-medium text-gray-400 pl-1">
                  Key
                </span>
                <span className="text-[11px] font-medium text-gray-400 pl-1">
                  Value
                </span>
              </div>

              {metaFields.map((row, index) => (
                <div
                  key={`${row.key}-${index}`}
                  className="grid grid-cols-[1fr_1fr_28px] gap-2 items-center"
                >
                  <Input
                    value={row.key}
                    onChange={(event) =>
                      updateField(index, "key", event.target.value)
                    }
                    placeholder="e.g. owner"
                    className="rounded-lg h-9 text-sm"
                  />
                  <Input
                    value={row.value}
                    onChange={(event) =>
                      updateField(index, "value", event.target.value)
                    }
                    placeholder="e.g. research-team"
                    className="rounded-lg h-9 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    disabled={metaFields.length === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors mt-1"
              >
                <Plus className="size-3.5" />
                Add field
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Create Dataset
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
