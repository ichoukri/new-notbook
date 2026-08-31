import Topbar from "@/components/app/topbar";
import { ProviderSettingsPanel } from "./components/provider-settings-panel";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-auto bg-gray-50/40">
      <Topbar title="Settings" />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-3xl px-8 py-7">
          <div className="mb-5">
            <h1 className="text-sm font-semibold text-gray-900">AI Providers</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Endpoints, models and credentials for embedding and summarization.
              Values not saved here come from the service environment.
            </p>
          </div>

          <ProviderSettingsPanel />
        </div>
      </main>
    </div>
  );
}
