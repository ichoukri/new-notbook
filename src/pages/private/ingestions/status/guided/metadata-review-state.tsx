import { useState } from "react";
import {
  CheckCircle2,
  Database,
  Globe,
  Loader2,
  Lock,
  Save,
  Shield,
  Tag,
  Users,
  X,
} from "lucide-react";
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

const VISIBILITY_OPTIONS: Array<{
  value: TAccessVisibility;
  label: string;
  description: string;
  icon: typeof Globe;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only you can access this document.",
    icon: Lock,
  },
  {
    value: "tenant",
    label: "Organisation",
    description: "Everyone in your organisation can access it.",
    icon: Globe,
  },
  {
    value: "roles",
    label: "Specific roles / users",
    description: "Restrict access to the roles and users you list.",
    icon: Shield,
  },
];

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
  const [visibility, setVisibility] = useState<TAccessVisibility>(
    existingPolicy.visibility === "private" ||
      existingPolicy.visibility === "roles"
      ? existingPolicy.visibility
      : "tenant",
  );
  const [roleIdsInput, setRoleIdsInput] = useState(
    asList(existingPolicy.role_ids).join(", "),
  );
  const [userIdsInput, setUserIdsInput] = useState(
    asList(existingPolicy.user_ids).join(", "),
  );

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

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
        role_ids: visibility === "roles" ? parseList(roleIdsInput) : [],
        user_ids: visibility === "roles" ? parseList(userIdsInput) : [],
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
        description="Add metadata and choose who can access this document, then complete the ingestion."
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

        <MotionItem>
          <Panel icon={Shield} title="Access">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = visibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      disabled={busy}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-violet-400 bg-violet-50/60 ring-2 ring-violet-100"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mb-1.5 size-4",
                          active ? "text-violet-600" : "text-gray-400",
                        )}
                      />
                      <p className="text-sm font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {visibility === "roles" && (
                <div className="grid gap-3 pt-1 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-600">
                      <Shield className="size-3.5" /> Role IDs
                    </label>
                    <input
                      value={roleIdsInput}
                      onChange={(event) => setRoleIdsInput(event.target.value)}
                      disabled={busy}
                      placeholder="role-a, role-b"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-600">
                      <Users className="size-3.5" /> User IDs
                    </label>
                    <input
                      value={userIdsInput}
                      onChange={(event) => setUserIdsInput(event.target.value)}
                      disabled={busy}
                      placeholder="user-1, user-2"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
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
