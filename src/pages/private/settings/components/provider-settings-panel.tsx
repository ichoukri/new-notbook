import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  Save,
  ShieldAlert,
  Undo2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ReindexConfirmationRequired,
  SettingsRevisionConflict,
  describeSettingsError,
  fetchProviderSettings,
  saveProviderSettings,
  testProviderSettings,
  type TProviderSettings,
  type TProviderTestResult,
} from "@/core/settings";
import { cn } from "@/lib/utils";
import {
  PROVIDER_CHOICES,
  PROVIDER_GROUPS,
  REINDEXING_FIELDS,
  SECTION_LABELS,
  TASK_ASSIGNMENT_FIELDS,
  type FieldSection,
  type ProviderField,
  type ProviderGroup,
} from "./provider-fields";

type FieldValue = string | number | boolean;
type Draft = Record<string, FieldValue>;
/** Rail selection: one provider, or the task-assignment pane. */
type PaneId = string;

const TASKS_PANE: PaneId = "__tasks__";
const SECTION_ORDER: FieldSection[] = ["connection", "models", "tuning"];

function StatusDot({
  tone,
}: {
  tone: "online" | "warn" | "offline" | "disabled";
}) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        tone === "online" && "bg-emerald-500",
        tone === "warn" && "bg-amber-500",
        tone === "offline" && "bg-gray-300",
        tone === "disabled" && "bg-gray-200",
      )}
    />
  );
}

function probeTone(
  enabled: boolean,
  probes: TProviderTestResult[],
): "online" | "warn" | "offline" | "disabled" {
  if (!enabled) return "disabled";
  if (probes.length === 0) return "offline";
  if (probes.some((probe) => !probe.online)) return "offline";
  return probes.some((probe) => probe.model_available === false)
    ? "warn"
    : "online";
}

const PROBE_LABELS: Record<TProviderTestResult["target"], string> = {
  openai: "OpenAI API",
  ollama: "Ollama",
  vllm_chat: "Chat endpoint",
  qwen_embedding: "Embedding endpoint",
};

const STATUS_LABELS = {
  online: "reachable",
  warn: "reachable with missing models",
  offline: "not tested or unreachable",
  disabled: "disabled",
} as const;

function RailButton({
  active,
  icon: Icon,
  label,
  detail,
  tone,
  dirty,
  onSelect,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  detail: string;
  tone?: "online" | "warn" | "offline" | "disabled";
  dirty: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={cn(
        "flex w-44 shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors lg:w-full lg:shrink",
        active ? "bg-white shadow-sm ring-1 ring-gray-200" : "hover:bg-white/60",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-gray-900">
            {label}
          </span>
          {tone && (
            <>
              <StatusDot tone={tone} />
              <span className="sr-only">Status: {STATUS_LABELS[tone]}</span>
            </>
          )}
        </span>
        <span className="block truncate text-[11px] text-gray-400">
          {detail}
        </span>
      </span>
      {dirty > 0 && (
        <span
          className="size-1.5 shrink-0 rounded-full bg-indigo-500"
          title={`${dirty} unsaved change${dirty === 1 ? "" : "s"}`}
        />
      )}
    </button>
  );
}

function FieldRow({
  field,
  value,
  source,
  disabled,
  secretUnavailable,
  resetPending,
  onToggleSource,
  onChange,
}: {
  field: ProviderField;
  value: FieldValue;
  source: "env" | "settings";
  disabled: boolean;
  secretUnavailable: boolean;
  resetPending: boolean;
  onToggleSource: () => void;
  onChange: (value: FieldValue) => void;
}) {
  const [secretVisible, setSecretVisible] = useState(false);
  const inputId = `provider-setting-${field.name}`;
  const descriptionId = `${inputId}-description`;
  const control =
    field.kind === "boolean" ? (
      <Switch
        id={inputId}
        aria-describedby={descriptionId}
        checked={Boolean(value)}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    ) : (
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          aria-describedby={descriptionId}
          className="h-9 flex-1"
          type={
            field.kind === "number"
              ? "number"
              : field.kind === "secret" && !secretVisible
                ? "password"
                : "text"
          }
          autoComplete={field.kind === "secret" ? "new-password" : undefined}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          disabled={disabled || secretUnavailable}
          onChange={(event) =>
            onChange(
              field.kind === "number"
                ? Number(event.target.value)
                : event.target.value,
            )
          }
        />
        {field.kind === "secret" && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 shrink-0"
            disabled={disabled || secretUnavailable}
            aria-label={secretVisible ? `Hide ${field.label}` : `Show ${field.label}`}
            aria-pressed={secretVisible}
            onClick={() => setSecretVisible((current) => !current)}
          >
            {secretVisible ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
        )}
        {field.suffix && (
          <span className="shrink-0 text-[11px] text-gray-400">
            {field.suffix}
          </span>
        )}
      </div>
    );

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-start sm:gap-6">
      <div className="min-w-0 sm:pt-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <label htmlFor={inputId} className="text-xs font-medium text-gray-800">
            {field.label}
          </label>
          <span
            className={cn(
              "rounded px-1 py-px text-[10px] font-semibold uppercase tracking-wide",
              source === "settings" && !resetPending
                ? "bg-indigo-50 text-indigo-700"
                : "bg-gray-100 text-gray-500",
            )}
          >
            {resetPending
              ? "Environment after save"
              : source === "settings"
                ? "Saved"
                : "Environment"}
          </span>
          {source === "settings" && (
            <button
              type="button"
              className="text-[10px] font-medium text-indigo-600 underline-offset-2 hover:underline disabled:opacity-50"
              disabled={disabled}
              onClick={onToggleSource}
            >
              {resetPending ? "Keep saved value" : "Use environment"}
            </button>
          )}
          {REINDEXING_FIELDS.has(field.name) && (
            <span
              className="rounded bg-amber-50 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-700"
              title="Changing this writes future vectors to a new collection"
            >
              Re-ingest
            </span>
          )}
        </div>
        <p
          id={descriptionId}
          className="mt-0.5 text-[11px] leading-relaxed text-gray-500"
        >
          {secretUnavailable
            ? "Set in the service environment — no encryption key is configured."
            : field.description}
        </p>
      </div>
      <div className="min-w-0">{control}</div>
    </div>
  );
}

function SectionBlock({
  section,
  fields,
  settings,
  draft,
  disabled,
  resetFields,
  onToggleSource,
  onFieldChange,
}: {
  section: FieldSection;
  fields: ProviderField[];
  settings: TProviderSettings;
  draft: Draft;
  disabled: boolean;
  resetFields: Set<string>;
  onToggleSource: (name: string) => void;
  onFieldChange: (name: string, value: FieldValue) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <section className="border-t border-gray-100 px-6 py-2 first:border-t-0">
      <h3 className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {SECTION_LABELS[section]}
      </h3>
      <div className="divide-y divide-gray-50">
        {fields.map((field) => (
          <FieldRow
            key={field.name}
            field={field}
            value={draft[field.name]}
            source={settings.sources[field.name] ?? "env"}
            disabled={disabled}
            secretUnavailable={
              field.kind === "secret" && !settings.encryption_available
            }
            resetPending={resetFields.has(field.name)}
            onToggleSource={() => onToggleSource(field.name)}
            onChange={(value) => onFieldChange(field.name, value)}
          />
        ))}
      </div>
    </section>
  );
}

function ProviderPane({
  group,
  settings,
  draft,
  probes,
  busy,
  testing,
  testDisabled,
  resetFields,
  onToggleSource,
  onEnabledChange,
  onFieldChange,
  onTest,
}: {
  group: ProviderGroup;
  settings: TProviderSettings;
  draft: Draft;
  probes: TProviderTestResult[];
  busy: boolean;
  testing: boolean;
  testDisabled: boolean;
  resetFields: Set<string>;
  onToggleSource: (name: string) => void;
  onEnabledChange: (enabled: boolean) => void;
  onFieldChange: (name: string, value: FieldValue) => void;
  onTest: () => void;
}) {
  const Icon = group.icon;
  const enabled = draft[group.enabledField] !== false;
  const collection = group.embeddingProvider
    ? settings.collections[group.embeddingProvider]
    : undefined;
  const tone = probeTone(enabled, probes);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b border-gray-50 bg-gray-50/40 px-6 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
            <Icon className="size-4 text-indigo-600" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                {group.label}
              </h2>
              <StatusDot tone={tone} />
              <span className="text-[11px] text-gray-400">
                {!enabled
                  ? "Off"
                  : tone === "online"
                    ? "Reachable"
                    : tone === "warn"
                      ? "Model not found"
                      : probes.length > 0
                        ? "Unreachable"
                        : "Not tested"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{group.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={onTest}
              disabled={busy || testDisabled || !enabled}
            >
              {testing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plug className="size-3.5" />
              )}
              Test
            </Button>
            <Switch
              checked={enabled}
              disabled={busy}
              aria-label={`Enable ${group.label}`}
              onCheckedChange={onEnabledChange}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span>
              {resetFields.has(group.enabledField)
                ? "Environment after save"
                : settings.sources[group.enabledField] === "settings"
                  ? "Saved override"
                  : "Environment"}
            </span>
            {settings.sources[group.enabledField] === "settings" && (
              <button
                type="button"
                className="font-medium text-indigo-600 underline-offset-2 hover:underline disabled:opacity-50"
                disabled={busy}
                onClick={() => onToggleSource(group.enabledField)}
              >
                {resetFields.has(group.enabledField)
                  ? "Keep saved value"
                  : "Use environment"}
              </button>
            )}
          </div>
        </div>
      </header>

      {probes.length > 0 && (
        <div
          className="grid gap-2 border-b border-gray-100 bg-gray-50/30 px-6 py-3 sm:grid-cols-2"
          aria-live="polite"
        >
          {probes.map((probe) => (
            <div key={probe.target} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
                <StatusDot
                  tone={
                    !probe.online
                      ? "offline"
                      : probe.model_available === false
                        ? "warn"
                        : "online"
                  }
                />
                {PROBE_LABELS[probe.target]}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                {probe.detail}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className={cn(!enabled && "opacity-45")} aria-disabled={!enabled}>
        {SECTION_ORDER.map((section) => (
          <SectionBlock
            key={section}
            section={section}
            fields={group.fields.filter((field) => field.section === section)}
            settings={settings}
            draft={draft}
            disabled={busy || !enabled}
            resetFields={resetFields}
            onToggleSource={onToggleSource}
            onFieldChange={onFieldChange}
          />
        ))}
      </div>

      {collection && (
        <footer className="flex items-center gap-2 border-t border-gray-50 bg-gray-50/30 px-6 py-3 text-[11px] text-gray-500">
          <Database className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            Vectors are written to{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-700">
              {collection}
            </code>
          </span>
        </footer>
      )}
    </div>
  );
}

function TasksPane({
  draft,
  settings,
  busy,
  resetFields,
  onToggleSource,
  onFieldChange,
}: {
  draft: Draft;
  settings: TProviderSettings;
  busy: boolean;
  resetFields: Set<string>;
  onToggleSource: (name: string) => void;
  onFieldChange: (name: string, value: FieldValue) => void;
}) {
  const isChoiceEnabled = (value: string) => {
    const choice = PROVIDER_CHOICES.find((item) => item.value === value);
    if (!choice) return false;
    const group = PROVIDER_GROUPS.find((item) => item.id === choice.value);
    return group ? draft[group.enabledField] !== false : true;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-gray-50 bg-gray-50/40 px-6 py-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
          <Workflow className="size-4 text-indigo-600" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Task assignment
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Default model behavior for chat, query rewriting and grounded
            answers. Graph extraction is configured in Knowledge Graph.
          </p>
        </div>
      </header>

      <div className="divide-y divide-gray-50 px-6 py-2">
        {TASK_ASSIGNMENT_FIELDS.map((field) => {
          const inputId = `provider-setting-${field.name}`;
          const descriptionId = `${inputId}-description`;
          const source = settings.sources[field.name] ?? "env";
          const resetPending = resetFields.has(field.name);
          return (
            <div
              key={field.name}
              className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-start sm:gap-6"
            >
              <div className="min-w-0 sm:pt-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <label htmlFor={inputId} className="text-xs font-medium text-gray-800">
                    {field.label}
                  </label>
                  <span
                    className={cn(
                      "rounded px-1 py-px text-[10px] font-semibold uppercase tracking-wide",
                      source === "settings" && !resetPending
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {resetPending
                      ? "Environment after save"
                      : source === "settings"
                        ? "Saved"
                        : "Environment"}
                  </span>
                  {source === "settings" && (
                    <button
                      type="button"
                      className="text-[10px] font-medium text-indigo-600 underline-offset-2 hover:underline disabled:opacity-50"
                      disabled={busy}
                      onClick={() => onToggleSource(field.name)}
                    >
                      {resetPending ? "Keep saved value" : "Use environment"}
                    </button>
                  )}
                </div>
                <p
                  id={descriptionId}
                  className="mt-0.5 text-[11px] leading-relaxed text-gray-500"
                >
                  {field.description}
                </p>
              </div>
              <div className="min-w-0">
                {field.kind === "provider" ? (
                  <select
                    id={inputId}
                    aria-describedby={descriptionId}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 disabled:opacity-60"
                    value={String(draft[field.name] ?? "")}
                    disabled={busy}
                    onChange={(event) =>
                      onFieldChange(field.name, event.target.value)
                    }
                  >
                    {PROVIDER_CHOICES.map((choice) => {
                      const enabled = isChoiceEnabled(choice.value);
                      return (
                        <option
                          key={choice.value}
                          value={choice.value}
                          disabled={!enabled}
                        >
                          {choice.label}{enabled ? "" : " (disabled)"}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <Input
                    id={inputId}
                    aria-describedby={descriptionId}
                    className="h-9 w-full"
                    type={field.kind === "number" ? "number" : "text"}
                    value={String(draft[field.name] ?? "")}
                    disabled={busy}
                    onChange={(event) =>
                      onFieldChange(
                        field.name,
                        field.kind === "number"
                          ? Number(event.target.value)
                          : event.target.value,
                      )
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProviderSettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
} = {}) {
  const [settings, setSettings] = useState<TProviderSettings | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [resetFields, setResetFields] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState("");
  const [conflictError, setConflictError] = useState("");
  const [busy, setBusy] = useState(false);
  const [testingPane, setTestingPane] = useState<string | null>(null);
  const [probes, setProbes] = useState<TProviderTestResult[]>([]);
  const [activePane, setActivePane] = useState<PaneId>(PROVIDER_GROUPS[0].id);

  const applyResponse = useCallback((next: TProviderSettings) => {
    setSettings(next);
    setDraft({ ...next.values });
    setResetFields(new Set());
    setConflictError("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProviderSettings()
      .then((next) => {
        if (!cancelled) applyResponse(next);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(describeSettingsError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [applyResponse]);

  const dirtyFields = useMemo(() => {
    if (!settings) return [];
    const dirty = new Set(
      Object.keys(draft).filter(
        (name) => String(draft[name]) !== String(settings.values[name]),
      ),
    );
    for (const name of resetFields) dirty.add(name);
    return [...dirty];
  }, [draft, resetFields, settings]);

  const overridePayload = useMemo(() => {
    if (!settings) return {};
    const values: Draft = {};
    const fields =
      settings.editable_fields.length > 0
        ? settings.editable_fields
        : Object.keys(draft);
    for (const name of fields) {
      if (resetFields.has(name) || !(name in draft)) continue;
      const changed = String(draft[name]) !== String(settings.values[name]);
      if (settings.sources[name] === "settings" || changed) {
        values[name] = draft[name];
      }
    }
    return values;
  }, [draft, resetFields, settings]);

  useEffect(() => {
    onDirtyChange?.(dirtyFields.length > 0);
    return () => onDirtyChange?.(false);
  }, [dirtyFields.length, onDirtyChange]);

  const updateField = useCallback((name: string, value: FieldValue) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setResetFields((current) => {
      if (!current.has(name)) return current;
      const next = new Set(current);
      next.delete(name);
      return next;
    });
  }, []);

  const toggleFieldSource = useCallback(
    (name: string) => {
      if (!settings) return;
      const resetting = !resetFields.has(name);
      const providerGroup = PROVIDER_GROUPS.find(
        (group) => group.enabledField === name,
      );
      if (
        resetting &&
        providerGroup &&
        settings.environment_values[name] === false
      ) {
        const assignments = TASK_ASSIGNMENT_FIELDS.filter(
          (field) =>
            field.kind === "provider" && draft[field.name] === providerGroup.id,
        );
        if (assignments.length > 0) {
          toast.error(
            `Reassign ${assignments.map((field) => field.label).join(" and ")} before disabling ${providerGroup.label}.`,
          );
          setActivePane(TASKS_PANE);
          return;
        }
        if (draft.graph_extraction_provider === providerGroup.id) {
          toast.error(
            `Choose another extraction provider in Knowledge Graph before disabling ${providerGroup.label}.`,
          );
          return;
        }
      }
      setResetFields((current) => {
        const next = new Set(current);
        if (resetting) next.add(name);
        else next.delete(name);
        return next;
      });
      setDraft((current) => ({
        ...current,
        [name]: resetting
          ? (settings.environment_values[name] ?? settings.values[name])
          : settings.values[name],
      }));
    },
    [draft, resetFields, settings],
  );

  const reloadSettings = useCallback(async () => {
    setLoadError("");
    try {
      applyResponse(await fetchProviderSettings());
    } catch (error) {
      setLoadError(describeSettingsError(error));
    }
  }, [applyResponse]);

  /** Unsaved changes per rail entry, so the rail shows where they are. */
  const dirtyByPane = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of PROVIDER_GROUPS) {
      const owned = new Set([
        group.enabledField,
        ...group.fields.map((field) => field.name),
      ]);
      counts[group.id] = dirtyFields.filter((name) => owned.has(name)).length;
    }
    const taskFields = new Set(TASK_ASSIGNMENT_FIELDS.map((f) => f.name));
    counts[TASKS_PANE] = dirtyFields.filter((name) =>
      taskFields.has(name),
    ).length;
    return counts;
  }, [dirtyFields]);

  const reindexingChanges = dirtyFields.filter((name) =>
    REINDEXING_FIELDS.has(name),
  );

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setBusy(true);
    try {
      // The backend refuses a collection-moving change until it has been
      // acknowledged, and its message names exactly what moves — so ask with
      // that text and retry once, rather than predicting the answer here.
      let response;
      try {
        response = await saveProviderSettings(overridePayload, {
          expectedRevision: settings.revision,
        });
      } catch (error) {
        if (!(error instanceof ReindexConfirmationRequired)) throw error;
        if (!window.confirm(error.message)) return;
        response = await saveProviderSettings(overridePayload, {
          acknowledgeReindex: true,
          expectedRevision: settings.revision,
        });
      }

      applyResponse(response);
      if (response.reindex_required.length > 0) {
        toast.warning(
          `Saved. ${response.reindex_required.join(", ")} now writes to a new collection — existing documents must be re-ingested to be searchable under the new profile.`,
        );
      } else {
        toast.success("Provider settings saved.");
      }
    } catch (error) {
      if (error instanceof SettingsRevisionConflict) {
        setConflictError(error.message);
      }
      toast.error(describeSettingsError(error));
    } finally {
      setBusy(false);
    }
  }, [applyResponse, overridePayload, settings]);

  const handleTest = useCallback(
    async (group: ProviderGroup) => {
      if (testingPane) return;
      setTestingPane(group.id);
      try {
        // Probe the values currently on screen, not the saved ones, so an
        // endpoint can be verified before it is committed.
        const results = await testProviderSettings(draft, group.probeTargets);
        setProbes((current) => [
          ...current.filter(
            (probe) => !group.probeTargets.includes(probe.target),
          ),
          ...results,
        ]);
      } catch (error) {
        toast.error(describeSettingsError(error));
      } finally {
        setTestingPane(null);
      }
    },
    [draft, testingPane],
  );

  const handleProviderEnabledChange = useCallback(
    (group: ProviderGroup, enabled: boolean) => {
      if (!enabled) {
        const assignments = TASK_ASSIGNMENT_FIELDS.filter(
          (field) =>
            field.kind === "provider" && draft[field.name] === group.id,
        );
        if (assignments.length > 0) {
          toast.error(
            `Reassign ${assignments.map((field) => field.label).join(" and ")} before disabling ${group.label}.`,
          );
          setActivePane(TASKS_PANE);
          return;
        }
        if (draft.graph_extraction_provider === group.id) {
          toast.error(
            `Choose another extraction provider in Knowledge Graph before disabling ${group.label}.`,
          );
          return;
        }
      }
      updateField(group.enabledField, enabled);
    },
    [draft, updateField],
  );

  if (loadError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Could not load provider settings</p>
          <p className="mt-0.5 text-xs text-red-700">{loadError}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void reloadSettings()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-6 py-8 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Loading provider settings…
      </div>
    );
  }

  const activeGroup = PROVIDER_GROUPS.find((group) => group.id === activePane);

  return (
    <div className="space-y-4">
      {!settings.encryption_available && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">API keys are read-only here</p>
            <p className="mt-0.5">
              The service could not open or create a credential-encryption key,
              so keys must be set in its environment. Everything else is still
              editable.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row">
        <nav
          className="flex shrink-0 gap-1.5 overflow-x-auto rounded-xl bg-gray-100/70 p-1.5 lg:w-52 lg:flex-col lg:overflow-visible"
          aria-label="Provider settings"
        >
          {PROVIDER_GROUPS.map((group) => {
            const enabled = draft[group.enabledField] !== false;
            return (
              <RailButton
                key={group.id}
                active={activePane === group.id}
                icon={group.icon}
                label={group.label}
                detail={enabled ? group.description : "Off"}
                tone={probeTone(
                  enabled,
                  probes.filter((probe) =>
                    group.probeTargets.includes(probe.target),
                  ),
                )}
                dirty={dirtyByPane[group.id] ?? 0}
                onSelect={() => setActivePane(group.id)}
              />
            );
          })}

          <div className="hidden shrink-0 bg-gray-200 lg:my-1 lg:block lg:h-px" />

          <RailButton
            active={activePane === TASKS_PANE}
            icon={Workflow}
            label="Tasks"
            detail="Chat & graph extraction"
            dirty={dirtyByPane[TASKS_PANE] ?? 0}
            onSelect={() => setActivePane(TASKS_PANE)}
          />
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {conflictError && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-800">
              <div>
                <p className="font-semibold">
                  A newer settings revision is available
                </p>
                <p className="mt-0.5">{conflictError}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => void reloadSettings()}
              >
                Reload latest
              </Button>
            </div>
          )}

          {reindexingChanges.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">
                  These changes start a new vector collection
                </p>
                <p className="mt-0.5">
                  {reindexingChanges.join(", ")} — documents already ingested
                  keep their current vectors and must be re-ingested to be
                  searchable under the new profile.
                </p>
              </div>
            </div>
          )}

          {activeGroup ? (
            <ProviderPane
              group={activeGroup}
              settings={settings}
              draft={draft}
              probes={probes.filter((probe) =>
                activeGroup.probeTargets.includes(probe.target),
              )}
              busy={busy}
              testing={testingPane === activeGroup.id}
              testDisabled={testingPane !== null}
              resetFields={resetFields}
              onToggleSource={toggleFieldSource}
              onEnabledChange={(enabled) =>
                handleProviderEnabledChange(activeGroup, enabled)
              }
              onTest={() => handleTest(activeGroup)}
              onFieldChange={updateField}
            />
          ) : (
            <TasksPane
              draft={draft}
              settings={settings}
              busy={busy}
              resetFields={resetFields}
              onToggleSource={toggleFieldSource}
              onFieldChange={updateField}
            />
          )}
        </div>
      </div>

      {/* Follows the page: changes on one pane are saved together with the
          rest, so the bar must stay reachable from every pane. */}
      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="min-w-0 truncate text-[11px] text-gray-500">
          {dirtyFields.length > 0 ? (
            <span className="font-medium text-gray-700">
              {dirtyFields.length} unsaved change
              {dirtyFields.length === 1 ? "" : "s"}
            </span>
          ) : settings.updated_at ? (
            `Saved by ${settings.updated_by ?? "unknown"} · revision ${settings.revision}`
          ) : (
            "Everything is coming from the service environment."
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {dirtyFields.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-gray-500"
              disabled={busy}
              onClick={() => {
                setDraft({ ...settings.values });
                setResetFields(new Set());
                setConflictError("");
              }}
            >
              <Undo2 className="size-3.5" />
              Discard
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 min-w-28 gap-1.5"
            disabled={busy || dirtyFields.length === 0}
            onClick={() => void handleSave()}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : dirtyFields.length === 0 ? (
              <Check className="size-3.5" />
            ) : (
              <Save className="size-3.5" />
            )}
            {dirtyFields.length === 0 ? "Saved" : "Save changes"}
          </Button>
        </div>
      </div>

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-gray-400">
        Changes reach the API and ingestion workers within about ten seconds.
        Endpoint and task changes affect new requests; embedding-profile changes
        affect future ingestions and require existing documents to be re-ingested.
      </p>
    </div>
  );
}
