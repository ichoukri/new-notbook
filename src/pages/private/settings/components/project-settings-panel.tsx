import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Save,
} from "lucide-react";
import { Link } from "react-router";
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
  type TProviderSettings,
} from "@/core/settings";
import { cn } from "@/lib/utils";
import {
  type ProjectSettingsSection,
  type RuntimeField,
  SYSTEM_SECTION_ICON,
} from "./project-settings-config";

type FieldValue = string | number | boolean;
type Draft = Record<string, FieldValue>;

function RuntimeControl({
  field,
  value,
  draft,
  disabled,
  onChange,
}: {
  field: RuntimeField;
  value: FieldValue;
  draft: Draft;
  disabled: boolean;
  onChange: (value: FieldValue) => void;
}) {
  const id = `project-setting-${field.name}`;
  const descriptionId = `${id}-description`;

  if (field.kind === "boolean") {
    return (
      <Switch
        id={id}
        aria-describedby={descriptionId}
        checked={Boolean(value)}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    );
  }

  if (field.kind === "select") {
    return (
      <select
        id={id}
        aria-describedby={descriptionId}
        className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        value={String(value ?? "")}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.options?.map((option) => {
          const enabledField = `${option.value}_enabled`;
          const providerDisabled =
            field.name === "graph_extraction_provider" &&
            enabledField in draft &&
            draft[enabledField] === false;
          return (
            <option
              key={option.value}
              value={option.value}
              disabled={providerDisabled}
            >
              {option.label}{providerDisabled ? " (disabled)" : ""}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        aria-describedby={descriptionId}
        className="h-9 min-w-0"
        type={field.kind === "number" ? "number" : "text"}
        value={String(value ?? "")}
        disabled={disabled}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(event) =>
          onChange(
            field.kind === "number"
              ? Number(event.target.value)
              : event.target.value,
          )
        }
      />
      {field.suffix && (
        <span className="shrink-0 text-[11px] text-gray-400">{field.suffix}</span>
      )}
    </div>
  );
}

function RuntimeFieldRow({
  field,
  value,
  source,
  resetPending,
  draft,
  busy,
  onChange,
  onToggleSource,
}: {
  field: RuntimeField;
  value: FieldValue;
  source: "env" | "settings";
  resetPending: boolean;
  draft: Draft;
  busy: boolean;
  onChange: (value: FieldValue) => void;
  onToggleSource: () => void;
}) {
  const id = `project-setting-${field.name}`;
  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] sm:items-start sm:gap-8">
      <div className="min-w-0 sm:pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <label htmlFor={id} className="text-xs font-medium text-gray-800">
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
              onClick={onToggleSource}
            >
              {resetPending ? "Keep saved value" : "Use environment"}
            </button>
          )}
        </div>
        <p
          id={`${id}-description`}
          className="mt-1 max-w-xl text-[11px] leading-relaxed text-gray-500"
        >
          {field.description}
        </p>
      </div>
      <RuntimeControl
        field={field}
        value={value}
        draft={draft}
        disabled={busy}
        onChange={onChange}
      />
    </div>
  );
}

export function ProjectSettingsPanel({
  section,
  onDirtyChange,
}: {
  section: ProjectSettingsSection;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState<TProviderSettings | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [resetFields, setResetFields] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState("");
  const [conflictError, setConflictError] = useState("");
  const [busy, setBusy] = useState(false);

  const applyResponse = useCallback((next: TProviderSettings) => {
    setSettings(next);
    setDraft({ ...next.values });
    setResetFields(new Set());
    setConflictError("");
  }, []);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      applyResponse(await fetchProviderSettings());
    } catch (error) {
      setLoadError(describeSettingsError(error));
    }
  }, [applyResponse]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dirtyFields = useMemo(() => {
    if (!settings) return [];
    const dirty = section.fields
      .map((field) => field.name)
      .filter(
        (name) =>
          resetFields.has(name) ||
          String(draft[name]) !== String(settings.values[name]),
      );
    return dirty;
  }, [draft, resetFields, section.fields, settings]);

  const overridePayload = useMemo(() => {
    if (!settings) return {};
    const values: Draft = {};
    for (const name of settings.editable_fields) {
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

  const updateField = (name: string, value: FieldValue) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setResetFields((current) => {
      if (!current.has(name)) return current;
      const next = new Set(current);
      next.delete(name);
      return next;
    });
  };

  const toggleSource = (name: string) => {
    if (!settings) return;
    const resetting = !resetFields.has(name);
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
  };

  const discard = () => {
    if (!settings) return;
    setDraft({ ...settings.values });
    setResetFields(new Set());
  };

  const save = async () => {
    if (!settings || dirtyFields.length === 0) return;
    setBusy(true);
    try {
      let response;
      try {
        response = await saveProviderSettings(overridePayload, {
          expectedRevision: settings.revision,
        });
      } catch (error) {
        if (!(error instanceof ReindexConfirmationRequired)) throw error;
        if (!window.confirm(error.message)) return;
        response = await saveProviderSettings(overridePayload, {
          expectedRevision: settings.revision,
          acknowledgeReindex: true,
        });
      }
      applyResponse(response);
      toast.success(`${section.shortTitle} settings saved.`);
    } catch (error) {
      if (error instanceof SettingsRevisionConflict) {
        setConflictError(error.message);
      }
      toast.error(describeSettingsError(error));
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Could not load project settings</p>
          <p className="mt-0.5 text-xs text-red-700">{loadError}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-6 py-8 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Loading {section.shortTitle.toLowerCase()} settings…
      </div>
    );
  }

  const availableFields = section.fields.filter((field) =>
    settings.editable_fields.includes(field.name),
  );
  const groups = [...new Set(availableFields.map((field) => field.group))];

  return (
    <div className="space-y-4">
      {conflictError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">A newer settings revision exists</p>
            <p className="mt-0.5">{conflictError}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            Reload
          </Button>
        </div>
      )}

      {groups.map((group) => (
        <section
          key={group}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
        >
          <header className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <h2 className="text-xs font-semibold text-gray-900">{group}</h2>
          </header>
          <div className="divide-y divide-gray-100 px-6">
            {availableFields
              .filter((field) => field.group === group)
              .map((field) => (
                <RuntimeFieldRow
                  key={field.name}
                  field={field}
                  value={draft[field.name]}
                  source={settings.sources[field.name] ?? "env"}
                  resetPending={resetFields.has(field.name)}
                  draft={draft}
                  busy={busy}
                  onChange={(value) => updateField(field.name, value)}
                  onToggleSource={() => toggleSource(field.name)}
                />
              ))}
          </div>
        </section>
      ))}

      {availableFields.length !== section.fields.length && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Some controls are unavailable because the running backend is older
          than this console.
        </div>
      )}

      <footer className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg shadow-gray-200/50 backdrop-blur">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {dirtyFields.length > 0 ? (
            <>
              <span className="size-1.5 rounded-full bg-indigo-500" />
              {dirtyFields.length} unsaved change
              {dirtyFields.length === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <Check className="size-3.5 text-emerald-600" />
              All changes saved
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || dirtyFields.length === 0}
            onClick={discard}
          >
            <RotateCcw className="size-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            disabled={busy || dirtyFields.length === 0}
            onClick={() => void save()}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save changes
          </Button>
        </div>
      </footer>
    </div>
  );
}

const MANAGED_GROUPS = [
  {
    title: "Application workers",
    fields: ["dev_mode", "workers", "celery_worker_pool", "celery_worker_concurrency"],
  },
  {
    title: "Vector database",
    fields: ["mongodb_database_name", "mongodb_collection_name"],
  },
  {
    title: "Object storage",
    fields: ["s3_endpoint_url", "s3_region", "s3_bucket", "s3_use_path_style"],
  },
  {
    title: "Neo4j",
    fields: ["neo4j_enabled", "neo4j_uri", "neo4j_database"],
  },
  {
    title: "Scheduled maintenance",
    fields: [
      "orphan_sweep_enabled",
      "orphan_sweep_interval_seconds",
      "stale_document_sweep_enabled",
      "stale_document_sweep_interval_seconds",
      "upload_intent_sweep_enabled",
      "upload_intent_sweep_interval_seconds",
    ],
  },
] as const;

const MANAGED_LABELS: Record<string, string> = {
  dev_mode: "Development mode",
  workers: "API workers",
  celery_worker_pool: "Celery pool",
  celery_worker_concurrency: "Celery concurrency",
  mongodb_database_name: "Database",
  mongodb_collection_name: "Default collection",
  s3_endpoint_url: "Endpoint",
  s3_region: "Region",
  s3_bucket: "Bucket",
  s3_use_path_style: "Path-style addressing",
  neo4j_enabled: "Enabled",
  neo4j_uri: "Bolt URI",
  neo4j_database: "Database",
  orphan_sweep_enabled: "Orphan-vector sweep",
  orphan_sweep_interval_seconds: "Orphan sweep interval",
  stale_document_sweep_enabled: "Stale-document sweep",
  stale_document_sweep_interval_seconds: "Stale sweep interval",
  upload_intent_sweep_enabled: "Upload-intent sweep",
  upload_intent_sweep_interval_seconds: "Upload sweep interval",
};

function formatManagedValue(name: string, value: FieldValue | undefined) {
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (name.endsWith("_interval_seconds") && typeof value === "number") {
    if (value % 86400 === 0) return `${value / 86400} day${value === 86400 ? "" : "s"}`;
    if (value % 3600 === 0) return `${value / 3600} hour${value === 3600 ? "" : "s"}`;
    if (value % 60 === 0) return `${value / 60} minutes`;
    return `${value} seconds`;
  }
  return String(value ?? "—");
}

export function SystemSettingsPanel() {
  const [settings, setSettings] = useState<TProviderSettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchProviderSettings()
      .then((next) => {
        if (!cancelled) setSettings(next);
      })
      .catch((caught) => {
        if (!cancelled) setError(describeSettingsError(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-6 py-8 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" /> Loading system configuration…
      </div>
    );
  }

  const Icon = SYSTEM_SECTION_ICON;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">Environment managed</p>
          <p className="mt-0.5 leading-relaxed">
            These values initialize long-lived clients or worker processes. Change
            them in the service environment, then restart the affected services.
            Credentials are intentionally never exposed here.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {MANAGED_GROUPS.map((group) => (
          <section
            key={group.title}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <header className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-5 py-4">
              <Icon className="size-3.5 text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-900">{group.title}</h2>
            </header>
            <dl className="divide-y divide-gray-100 px-5">
              {group.fields.map((name) => (
                <div key={name} className="flex items-center justify-between gap-6 py-3">
                  <dt className="text-xs text-gray-500">{MANAGED_LABELS[name]}</dt>
                  <dd className="max-w-[60%] truncate text-right font-mono text-[11px] text-gray-800" title={String(settings.managed_values[name] ?? "")}>
                    {formatManagedValue(name, settings.managed_values[name])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <Link
        to="/retrieval"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
      >
        Open Retrieval Test <ExternalLink className="size-3" />
      </Link>
    </div>
  );
}
