import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Database,
  Loader2,
  Save,
  Tag,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevertStageDialog } from "./revert-stage-dialog";
import {
  ActionBar,
  Hero,
  IngestionShell,
  MotionItem,
  MotionStack,
  Panel,
  PipelineStepper,
  StatusPill,
} from "@/components/ingestion/ui";
import type {
  TAccessVisibility,
  TDocumentMetadataPayload,
  TIngestionDocument,
  TIngestionPipelineStep,
} from "@/core/ingestions";
import { cn } from "@/lib/utils";

export function MetadataReviewState({
  document,
  datasetName,
  pipeline,
  onSave,
  onRevert,
  onCancel,
  isSaving,
  isReverting,
  isCancelling,
  banner,
}: {
  document: TIngestionDocument;
  datasetName: string;
  pipeline: TIngestionPipelineStep[];
  onSave: (payload: TDocumentMetadataPayload) => void;
  /** Steps back to the vectorisation review. */
  onRevert?: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isReverting?: boolean;
  isCancelling: boolean;
  /** Rendered above the content — the batch review queue bar. */
  banner?: ReactNode;
}) {
  const existingMeta = (document.docMetadata ?? {}) as Record<string, unknown>;
  const existingPolicy = (document.accessPolicy ?? {}) as Record<
    string,
    unknown
  >;
  const asString = (value: unknown, fallback = "") =>
    typeof value === "string" ? value : fallback;
  const asList = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  const savedTitle = asString(existingMeta.title, document.filename);
  const savedDescription = asString(existingMeta.description);
  const savedTags = asList(existingMeta.tags).join(", ");

  const [title, setTitle] = useState(savedTitle);
  const [description, setDescription] = useState(savedDescription);
  const [tagsInput, setTagsInput] = useState(savedTags);
  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  // The form fields live only in this component until "Save draft" persists
  // them; stepping back unmounts the form. Compare against what the document
  // actually holds (normalised the way submit() would send it) so Back can
  // be blocked while edits would be silently lost — the revert dialog
  // promises that nothing is deleted, and this keeps that promise true.
  const hasUnsavedChanges =
    JSON.stringify([title.trim(), description.trim(), parseList(tagsInput)]) !==
    JSON.stringify([
      savedTitle.trim(),
      savedDescription.trim(),
      parseList(savedTags),
    ]);

  // Access is no longer chosen here; preserve the document's existing policy
  // (defaulting to organisation-wide) so the payload contract stays intact.
  const visibility: TAccessVisibility =
    existingPolicy.visibility === "private" ||
    existingPolicy.visibility === "roles"
      ? existingPolicy.visibility
      : "tenant";

  const busy = isSaving || Boolean(isReverting) || isCancelling;
  const [showRevert, setShowRevert] = useState(false);

  const submit = (complete: boolean) => {
    onSave({
      metadata: {
        title: title.trim(),
        description: description.trim(),
        tags: parseList(tagsInput),
      },
      access_policy: {
        visibility,
        role_ids: asList(existingPolicy.role_ids),
        user_ids: asList(existingPolicy.user_ids),
      },
      complete,
    });
  };

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200";

  return (
    <IngestionShell title="Guided Ingestion" banner={banner}>
      <Hero
        icon={Tag}
        title={document.filename}
        mode="guided"
        meta={
          <span className="inline-flex items-center gap-1">
            <Database className="size-3.5 text-gray-400" />
            {datasetName}
          </span>
        }
        status={<StatusPill label="Metadata · review" tone="violet" pulse />}
        description="Add metadata, then complete the ingestion."
      />

      <PipelineStepper steps={pipeline} />

      <MotionStack className="space-y-5">
        <MotionItem>
          <Panel icon={Tag} title="Metadata">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={busy}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={busy}
                  rows={3}
                  className={cn(inputClass, "resize-y")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Tags{" "}
                  <span className="font-normal text-gray-400">
                    (comma separated)
                  </span>
                </label>
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  disabled={busy}
                  placeholder="finance, q3, report"
                  className={inputClass}
                />
              </div>
            </div>
          </Panel>
        </MotionItem>
      </MotionStack>

      <ActionBar>
        {onRevert && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRevert(true)}
            disabled={busy || hasUnsavedChanges}
            title={
              hasUnsavedChanges
                ? "Save your metadata as a draft (or undo the changes) before going back"
                : undefined
            }
          >
            {isReverting ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Undo2 className="mr-1.5 size-4" />
            )}
            Back
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          {isCancelling ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <X className="mr-1.5 size-4" />
          )}
          Cancel
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => submit(false)}
          disabled={busy}
        >
          {isSaving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-4" />
          )}
          Save draft
        </Button>
        <Button size="sm" onClick={() => submit(true)} disabled={busy}>
          {isSaving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1.5 size-4" />
          )}
          Complete document
        </Button>
      </ActionBar>

      {onRevert && (
        <RevertStageDialog
          open={showRevert}
          stage="metadata"
          isReverting={Boolean(isReverting)}
          onOpenChange={setShowRevert}
          onConfirm={() => {
            setShowRevert(false);
            onRevert();
          }}
        />
      )}
    </IngestionShell>
  );
}
