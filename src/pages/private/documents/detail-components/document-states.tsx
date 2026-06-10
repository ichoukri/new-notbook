import { AlertCircle, Loader2 } from "lucide-react";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";

export function DocumentLoadingState() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Document" breadcrumbs={[{ label: "Documents", path: "/documents" }]} />
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading document…
        </div>
      </main>
    </div>
  );
}

export function DocumentUnavailableState({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Document" breadcrumbs={[{ label: "Documents", path: "/documents" }]} />
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="size-6 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Document unavailable
          </h2>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <Button onClick={onBack}>Back to Documents</Button>
        </div>
      </main>
    </div>
  );
}
