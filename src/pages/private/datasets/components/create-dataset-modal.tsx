import { useState, type FormEvent } from "react";
import { Bot, Database, Loader2, Tag, Wrench } from "lucide-react";
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
import {
  buildCreateDatasetMetadata,
  DatasetMetadataValidationError,
  EMPTY_DATASET_METADATA_FIELD,
  type DatasetAgentProfile,
  type DatasetMetadataField,
} from "./dataset-agent-profile";
import { DatasetMetadataFieldsEditor } from "./dataset-metadata-fields-editor";
import { cn } from "@/lib/utils";

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
  const [agentProfile, setAgentProfile] =
    useState<DatasetAgentProfile>("generic");
  const [metaFields, setMetaFields] = useState<DatasetMetadataField[]>([
    { ...EMPTY_DATASET_METADATA_FIELD },
  ]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setTags("");
    setAgentProfile("generic");
    setMetaFields([{ ...EMPTY_DATASET_METADATA_FIELD }]);
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

    let datasetMetadata: Record<string, unknown>;
    try {
      datasetMetadata = buildCreateDatasetMetadata(metaFields, agentProfile);
    } catch (metadataError) {
      setError(
        metadataError instanceof DatasetMetadataValidationError
          ? metadataError.message
          : "Dataset metadata is invalid.",
      );
      return;
    }

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
              Chat agent profile
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                {
                  value: "generic",
                  label: "Generic",
                  hint: "Evidence-only answers",
                  icon: Bot,
                },
                {
                  value: "maintenance",
                  label: "Maintenance",
                  hint: "Tizert TAG and safety routing",
                  icon: Wrench,
                },
              ] as const).map((option) => {
                const Icon = option.icon;
                const selected = agentProfile === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAgentProfile(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                      selected
                        ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                        : "border-gray-200 hover:bg-gray-50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        selected ? "text-indigo-600" : "text-gray-400",
                      )}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-gray-700">
                        {option.label}
                      </span>
                      <span className="block text-[11px] leading-4 text-gray-400">
                        {option.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
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

          <DatasetMetadataFieldsEditor
            fields={metaFields}
            onChange={setMetaFields}
          />

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
