import { useState } from "react";
import { CheckCircle2, Database, Loader2, Save, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onCancel,
  isSaving,
  isCancelling,
}: {
  document: TIngestionDocument;
  datasetName: string;
  pipeline: TIngestionPipelineStep[];
  onSave: (payload: TDocumentMetadataPayload) => void;
  onCancel: () => void;
  isSaving: boolean;
  isCancelling: boolean;
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

  const [title, setTitle] = useState(
    asString(existingMeta.title, document.filename),
  );
  const [description, setDescription] = useState(
    asString(existingMeta.description),
  );
  const [tagsInput, setTagsInput] = useState(
    asList(existingMeta.tags).join(", "),
  );
  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  // Access is no longer chosen here; preserve the document's existing policy
  // (defaulting to organisation-wide) so the payload contract stays intact.
  const visibility: TAccessVisibility =
    existingPolicy.visibility === "private" ||
    existingPolicy.visibility === "roles"
      ? existingPolicy.visibility
      : "tenant";

  const busy = isSaving || isCancelling;

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
    <IngestionShell title="Guided Ingestion">
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
    </IngestionShell>
  );
}
