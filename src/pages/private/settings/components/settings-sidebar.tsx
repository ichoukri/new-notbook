import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SETTING_TABS, type SettingsTabId } from "./settings-config";

type SettingsSidebarProps = {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
};

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  return (
    <div className="w-56 flex-shrink-0 space-y-1">
      {SETTING_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
            activeTab === tab.id
              ? "border border-gray-100 bg-white text-indigo-700 shadow-sm"
              : "text-gray-600 hover:bg-white hover:text-gray-900",
          )}
        >
          <div
            className={cn(
              "flex size-7 flex-shrink-0 items-center justify-center rounded-lg",
              activeTab === tab.id
                ? "bg-indigo-50"
                : "bg-gray-100 group-hover:bg-gray-200",
            )}
          >
            <tab.icon
              className={cn(
                "size-3.5",
                activeTab === tab.id ? "text-indigo-600" : "text-gray-500",
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{tab.label}</p>
            <p className="truncate text-xs text-gray-400">{tab.desc}</p>
          </div>
          {activeTab === tab.id && (
            <ChevronRight className="size-3.5 flex-shrink-0 text-indigo-400" />
          )}
        </button>
      ))}
    </div>
  );
}
