import { useState, type FormEvent } from "react";
import {
  Archive,
  Bot,
  CheckCircle2,
  Loader2,
  Pencil,
  Tag,
  Wrench,
} from "lucide-react";
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
import type { TDataset } from "@/core/datasets";
import { cn } from "@/lib/utils";
import type { UpdateDatasetPayload } from "./dataset-detail-types";
import {
  buildDatasetMetadataUpdate,
  DatasetMetadataValidationError,
  getDatasetAgentProfile,
  type DatasetAgentProfile,
  type DatasetMetadataField,
  toDatasetMetadataFields,
} from "../components/dataset-agent-profile";
import { DatasetMetadataFieldsEditor } from "../components/dataset-metadata-fields-editor";

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
    icon: CheckCircle2,
    hint: "Available for retrieval",
  },
  {
    value: "archived",
    label: "Archived",
    icon: Archive,
    hint: "Kept for reference only",
  },
] as const;

export function EditDatasetDialog({
  dataset,
  open,
  onClose,
  onSave,
}: {
  dataset: TDataset;
  open: boolean;
  onClose: () => void;
  onSave: (payload: UpdateDatasetPayload) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <Pencil className="size-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Edit dataset</DialogTitle>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                Update the details of "{dataset.name}"
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* The dialog content unmounts on close, so the form always starts
            from the dataset as it currently stands. */}
        <EditDatasetForm
          dataset={dataset}
          onCancel={onClose}
          onSave={onSave}
          onSaved={onClose}
          onSubmittingChange={setIsSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditDatasetForm({
  dataset,
  onCancel,
  onSave,
  onSaved,
  onSubmittingChange,
}: {
  dataset: TDataset;
  onCancel: () => void;
  onSave: (payload: UpdateDatasetPayload) => Promise<void>;
  onSaved: () => void;
  onSubmittingChange: (isSubmitting: boolean) => void;
}) {
  // Background ingestion polling can refresh the parent while this form is
  // open. Keep the metadata baseline and concurrency token from the moment the
  // editor opened; adopting newer props here would let stale form values bypass
  // Fusion's optimistic 409 check.
  const [editBase] = useState(() => ({
    metadata: dataset.metadata,
    updatedAt: dataset.updatedAt,
  }));
  const [name, setName] = useState(dataset.name);
  const [description, setDescription] = useState(dataset.description);
  const [tags, setTags] = useState(dataset.tags.join(", "));
  const [status, setStatus] = useState<TDataset["status"]>(dataset.status);
  const [agentProfile, setAgentProfile] = useState<DatasetAgentProfile>(() =>
    getDatasetAgentProfile(dataset.metadata),
  );
  const [metaFields, setMetaFields] = useState<DatasetMetadataField[]>(() =>
    toDatasetMetadataFields(dataset.metadata),
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setSubmitting = (value: boolean) => {
    setIsSubmitting(value);
    onSubmittingChange(value);
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

    let datasetMetadata: Record<string, unknown> | undefined;
    try {
      datasetMetadata = buildDatasetMetadataUpdate(
        metaFields,
        editBase.metadata,
      );
    } catch (metadataError) {
      setError(
        metadataError instanceof DatasetMetadataValidationError
          ? metadataError.message
          : "Dataset metadata is invalid.",
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSave({
        expected_updated_at: editBase.updatedAt,
        name: name.trim(),
        description: description.trim() || null,
        status,
        tags: parsedTags.length > 0 ? parsedTags : null,
        agent_profile: agentProfile,
        ...(datasetMetadata
          ? {
              custom_metadata: datasetMetadata,
            }
          : {}),
      });
      setSubmitting(false);
      onSaved();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Could not update dataset."));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Dataset name
        </Label>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Product Documentation v3"
          className="h-10 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
            const OptionIcon = option.icon;
            const isSelected = agentProfile === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setAgentProfile(option.value)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                  isSelected
                    ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                    : "border-gray-200 hover:bg-gray-50",
                )}
              >
                <OptionIcon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    isSelected ? "text-indigo-600" : "text-gray-400",
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
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Description
        </Label>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the contents and purpose of this dataset..."
          rows={3}
          className="resize-none rounded-xl text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Status
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = status === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                  isSelected
                    ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                    : "border-gray-200 hover:bg-gray-50",
                )}
              >
                <OptionIcon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    isSelected ? "text-indigo-600" : "text-gray-400",
                  )}
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      isSelected ? "text-indigo-700" : "text-gray-700",
                    )}
                  >
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
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tags
          </Label>
          <span className="text-[11px] text-gray-400">Comma separated</span>
        </div>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="docs, api, sdk"
            className="h-10 rounded-xl pl-8"
          />
        </div>
      </div>

      <DatasetMetadataFieldsEditor fields={metaFields} onChange={setMetaFields} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <DialogFooter className="mt-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </button>
      </DialogFooter>
    </form>
  );
}
