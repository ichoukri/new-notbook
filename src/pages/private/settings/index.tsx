import {
  Bot,
  ChevronRight,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import Topbar from "@/components/app/topbar";
import { cn } from "@/lib/utils";
import { ProviderSettingsPanel } from "./components/provider-settings-panel";
import {
  PROJECT_SETTINGS_SECTIONS,
  SYSTEM_SECTION_ICON,
  type ProjectSettingsSection,
} from "./components/project-settings-config";
import {
  ProjectSettingsPanel,
  SystemSettingsPanel,
} from "./components/project-settings-panel";

type SettingsSectionId =
  | "overview"
  | "ai"
  | ProjectSettingsSection["id"]
  | "system";

type NavigationItem = {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const NAVIGATION: NavigationItem[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Project control center",
    icon: LayoutDashboard,
  },
  {
    id: "ai",
    label: "AI & models",
    description: "Providers, models and chat",
    icon: Bot,
  },
  ...PROJECT_SETTINGS_SECTIONS.map((section) => ({
    id: section.id,
    label: section.shortTitle,
    description: section.description,
    icon: section.icon,
  })),
  {
    id: "system",
    label: "System",
    description: "Environment infrastructure",
    icon: SYSTEM_SECTION_ICON,
  },
];

const VALID_SECTION_IDS = new Set(NAVIGATION.map((item) => item.id));

function SettingsOverview({
  onSelect,
}: {
  onSelect: (section: SettingsSectionId) => void;
}) {
  const cards = NAVIGATION.filter((item) => item.id !== "overview");
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-7 py-7 shadow-sm">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 shadow-sm ring-1 ring-indigo-100">
            <Settings2 className="size-3" /> Project control center
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-gray-950">
            One place to tune the complete RAG pipeline
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
            Configure each subsystem independently. Runtime-safe changes apply
            across API and worker processes; infrastructure connections stay tied
            to the service environment so the screen always reflects what is real.
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="group flex min-h-32 flex-col rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition group-hover:bg-indigo-50 group-hover:text-indigo-700">
                  <Icon className="size-4" />
                </span>
                <ChevronRight className="size-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">
                {item.label}
              </h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4">
          <SlidersHorizontal className="mt-0.5 size-4 shrink-0 text-indigo-600" />
          <div>
            <h3 className="text-xs font-semibold text-gray-900">Runtime controls</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              Saved values override the environment and are picked up by API and
              worker processes without a deployment.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-xs font-semibold text-gray-900">Safe boundaries</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              Secrets remain masked, inputs are validated, and connection settings
              that require a restart are read-only.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const requestedSection = searchParams.get("section") ?? "overview";
  const activeSection: SettingsSectionId = VALID_SECTION_IDS.has(
    requestedSection as SettingsSectionId,
  )
    ? (requestedSection as SettingsSectionId)
    : "overview";

  const selectSection = useCallback(
    (section: SettingsSectionId) => {
      if (section === activeSection) return;
      if (
        hasUnsavedChanges &&
        !window.confirm("Discard your unsaved settings changes?")
      ) {
        return;
      }
      setHasUnsavedChanges(false);
      if (section === "overview") setSearchParams({}, { replace: true });
      else setSearchParams({ section }, { replace: true });
    },
    [activeSection, hasUnsavedChanges, setSearchParams],
  );

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const activeProjectSection = PROJECT_SETTINGS_SECTIONS.find(
    (section) => section.id === activeSection,
  );
  const activeNavigation = NAVIGATION.find((item) => item.id === activeSection)!;
  const ActiveIcon = activeNavigation.icon;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/40">
      <Topbar title="Settings" />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-5 py-6 lg:flex-row lg:px-8">
          <aside className="shrink-0 lg:w-64">
            <div className="mb-4 px-2">
              <h1 className="text-sm font-semibold text-gray-950">Project settings</h1>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                Configure the behavior of every major service area.
              </p>
            </div>
            <nav
              aria-label="Project settings sections"
              className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
            >
              {NAVIGATION.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeSection;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => selectSection(item.id)}
                    className={cn(
                      "flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left transition lg:min-w-0",
                      active
                        ? "bg-white text-gray-950 shadow-sm ring-1 ring-gray-200"
                        : "text-gray-500 hover:bg-white/70 hover:text-gray-800",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500",
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">{item.label}</span>
                      <span className="hidden truncate text-[10px] text-gray-400 lg:block">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            {activeSection !== "overview" && (
              <header className="mb-5 flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-gray-100">
                  <ActiveIcon className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-950">
                    {activeProjectSection?.title ?? activeNavigation.label}
                  </h2>
                  <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-gray-500">
                    {activeNavigation.description}
                  </p>
                </div>
              </header>
            )}

            {activeSection === "overview" && (
              <SettingsOverview onSelect={selectSection} />
            )}
            {activeSection === "ai" && (
              <ProviderSettingsPanel onDirtyChange={setHasUnsavedChanges} />
            )}
            {activeProjectSection && (
              <ProjectSettingsPanel
                key={activeProjectSection.id}
                section={activeProjectSection}
                onDirtyChange={setHasUnsavedChanges}
              />
            )}
            {activeSection === "system" && <SystemSettingsPanel />}
          </div>
        </div>
      </main>
    </div>
  );
}
