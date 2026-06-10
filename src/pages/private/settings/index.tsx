import { useState } from "react";
import Topbar from "@/components/app/topbar";
import type { SettingsTabId } from "./components/settings-config";
import { SettingsSidebar } from "./components/settings-sidebar";
import { SettingsTabContent } from "./components/settings-tab-content";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("models");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-gray-50/40">
      <Topbar title="Settings" />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1400px] px-8 py-7">
          <div className="flex gap-5">
            <SettingsSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <div className="min-w-0 flex-1">
              <SettingsTabContent
                activeTab={activeTab}
                onSave={handleSave}
                saved={saved}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
