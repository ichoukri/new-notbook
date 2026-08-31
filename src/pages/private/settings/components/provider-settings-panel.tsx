import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Plug,
  Save,
  ShieldAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ReindexConfirmationRequired,
  describeSettingsError,
  fetchProviderSettings,
  saveProviderSettings,
  testProviderSettings,
  type TProviderSettings,
  type TProviderTestResult,
} from "@/core/settings";
import { cn } from "@/lib/utils";
import {
  PROVIDER_GROUPS,
  REINDEXING_FIELDS,
  type ProviderField,
  type ProviderGroup,
} from "./provider-fields";

type FieldValue = string | number | boolean;
type Draft = Record<string, FieldValue>;

function SourceBadge({ source }: { source: "env" | "settings" }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        source === "settings"
          ? "bg-indigo-50 text-indigo-700"
          : "bg-gray-100 text-gray-500",
      )}
      title={
        source === "settings"
          ? "Saved here, overriding the service environment"
          : "Coming from the service environment"
      }
    >
      {source === "settings" ? "Saved" : "Env"}
    </span>
  );
}

function FieldControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ProviderField;
  value: FieldValue;
  disabled: boolean;
  onChange: (value: FieldValue) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <Switch
        checked={Boolean(value)}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    );
  }
  return (
    <Input
      className="w-72"
      type={field.kind === "number" ? "number" : "text"}
      // Secrets arrive masked. Showing the mask as plain text makes it obvious
      // it is a placeholder, not a password the browser should offer to save.
      value={String(value ?? "")}
      placeholder={field.placeholder}
      disabled={disabled}
      onChange={(event) =>
        onChange(
          field.kind === "number"
            ? Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
}

function ProbePill({ result }: { result: TProviderTestResult | undefined }) {
  if (!result) return null;
  const modelMissing = result.online && result.model_available === false;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold",
        !result.online
          ? "bg-gray-100 text-gray-500"
          : modelMissing
            ? "bg-amber-50 text-amber-700"
            : "bg-emerald-50 text-emerald-700",
      )}
      title={result.detail}
    >
      {result.online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
      {!result.online ? "Unreachable" : modelMissing ? "Model missing" : "Online"}
    </span>
  );
}

function GroupCard({
  group,
  settings,
  draft,
  probe,
  busy,
  onFieldChange,
  onTest,
  testing,
}: {
  group: ProviderGroup;
  settings: TProviderSettings;
  draft: Draft;
  probe: TProviderTestResult | undefined;
  busy: boolean;
  onFieldChange: (name: string, value: FieldValue) => void;
  onTest: () => void;
  testing: boolean;
}) {
  const Icon = group.icon;
  const collection = group.embeddingProvider
    ? settings.collections[group.embeddingProvider]
    : undefined;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-50 bg-gray-50/40 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
            <Icon className="size-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{group.label}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{group.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProbePill result={probe} />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={onTest}
            disabled={busy || testing}
          >
            {testing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plug className="size-3.5" />
            )}
            Test
          </Button>
        </div>
      </div>

      <div className="divide-y divide-gray-50 px-6 py-4">
        {group.fields.map((field) => {
          const secretUnavailable =
            field.kind === "secret" && !settings.encryption_available;
          return (
            <div
              key={field.name}
              className="flex items-center justify-between gap-6 py-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">
                    {field.label}
                  </p>
                  <SourceBadge source={settings.sources[field.name] ?? "env"} />
                  {REINDEXING_FIELDS.has(field.name) && (
                    <span
                      className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                      title="Changing this writes future vectors to a new collection"
                    >
                      Re-ingest
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {secretUnavailable
                    ? "Set in the service environment — no encryption key is configured."
                    : field.description}
                </p>
              </div>
              <div className="flex-shrink-0">
                <FieldControl
                  field={field}
                  value={draft[field.name]}
                  disabled={busy || secretUnavailable}
                  onChange={(value) => onFieldChange(field.name, value)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {collection && (
        <div className="flex items-center gap-2 border-t border-gray-50 bg-gray-50/30 px-6 py-3 text-xs text-gray-500">
          <Database className="size-3.5 shrink-0" />
          <span>
            Vectors are written to{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-700">
              {collection}
            </code>
          </span>
        </div>
      )}
    </div>
  );
}

export function ProviderSettingsPanel() {
  const [settings, setSettings] = useState<TProviderSettings | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [testingGroup, setTestingGroup] = useState<string | null>(null);
  const [probes, setProbes] = useState<TProviderTestResult[]>([]);

  const applyResponse = useCallback((next: TProviderSettings) => {
    setSettings(next);
    setDraft({ ...next.values });
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
    return Object.keys(draft).filter(
      (name) => String(draft[name]) !== String(settings.values[name]),
    );
  }, [draft, settings]);

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
        response = await saveProviderSettings(draft);
      } catch (error) {
        if (!(error instanceof ReindexConfirmationRequired)) throw error;
        if (!window.confirm(error.message)) return;
        response = await saveProviderSettings(draft, {
          acknowledgeReindex: true,
        });
      }

      applyResponse(response);
      setSavedAt(Date.now());
      if (response.reindex_required.length > 0) {
        toast.warning(
          `Saved. ${response.reindex_required.join(", ")} now writes to a new collection — existing documents must be re-ingested to be searchable under the new profile.`,
        );
      } else {
        toast.success("Provider settings saved.");
      }
    } catch (error) {
      toast.error(describeSettingsError(error));
    } finally {
      setBusy(false);
    }
  }, [applyResponse, draft, settings]);

  const handleTest = useCallback(
    async (group: ProviderGroup) => {
      setTestingGroup(group.id);
      try {
        // Probe the values currently on screen, not the saved ones, so an
        // endpoint can be verified before it is committed.
        setProbes(await testProviderSettings(draft));
      } catch (error) {
        toast.error(describeSettingsError(error));
      } finally {
        setTestingGroup(null);
      }
    },
    [draft],
  );

  if (loadError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">Could not load provider settings</p>
          <p className="mt-0.5 text-xs text-red-700">{loadError}</p>
        </div>
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

  const justSaved = Date.now() - savedAt < 2000;

  return (
    <div className="space-y-4">
      {!settings.encryption_available && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-xs text-amber-800">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">API keys are read-only here</p>
            <p className="mt-0.5">
              Set <code className="font-mono">SETTINGS_ENCRYPTION_KEY</code> on the
              service to store credentials from this page. Everything else can
              still be edited.
            </p>
          </div>
        </div>
      )}

      {reindexingChanges.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">
              These changes start a new vector collection
            </p>
            <p className="mt-0.5">
              {reindexingChanges.join(", ")} — documents already ingested keep
              their current vectors and must be re-ingested to be searchable
              under the new profile.
            </p>
          </div>
        </div>
      )}

      {PROVIDER_GROUPS.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          settings={settings}
          draft={draft}
          probe={probes.find((result) => result.target === group.probeTarget)}
          busy={busy}
          testing={testingGroup === group.id}
          onTest={() => handleTest(group)}
          onFieldChange={(name, value) =>
            setDraft((current) => ({ ...current, [name]: value }))
          }
        />
      ))}

      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
        <p className="text-xs text-gray-400">
          {settings.updated_at
            ? `Last saved by ${settings.updated_by ?? "unknown"} · revision ${settings.revision}`
            : "No overrides saved — everything is coming from the service environment."}
          {dirtyFields.length > 0 && (
            <span className="ml-1 font-medium text-gray-600">
              · {dirtyFields.length} unsaved change
              {dirtyFields.length === 1 ? "" : "s"}
            </span>
          )}
        </p>
        <Button
          size="sm"
          className={cn(
            "min-w-32 gap-2 transition-all",
            justSaved ? "bg-emerald-600 hover:bg-emerald-600" : "",
          )}
          disabled={busy || dirtyFields.length === 0}
          onClick={() => void handleSave()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : justSaved ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {justSaved ? "Saved!" : "Save changes"}
        </Button>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-gray-400">
        Changes reach the API and every ingestion worker within about ten
        seconds, and apply to new ingestions only.
      </p>
    </div>
  );
}
