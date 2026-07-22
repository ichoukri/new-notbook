import { AlertCircle, ArrowLeft, FileText, RefreshCw } from "lucide-react";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";

export function DocumentLoadingState() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f6fa]">
      <Topbar title="Document" breadcrumbs={[{ label: "Documents", path: "/documents" }]} />
      <main className="flex-1 overflow-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1480px] animate-pulse">
          <div className="h-64 rounded-[26px] bg-slate-900">
            <div className="flex gap-4 p-8">
              <div className="size-16 rounded-2xl bg-white/10" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-5 w-28 rounded bg-white/10" />
                <div className="h-8 w-2/5 rounded bg-white/10" />
                <div className="h-4 w-3/5 rounded bg-white/10" />
              </div>
            </div>
          </div>
          <div className="mt-5 h-14 border-b border-gray-200 bg-gray-100" />
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.72fr)]">
            <div className="space-y-5">
              <div className="h-20 rounded-2xl bg-white" />
              <div className="h-72 rounded-2xl bg-white" />
            </div>
            <div className="h-96 rounded-2xl bg-white" />
          </div>
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
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f6fa]">
      <Topbar title="Document" breadcrumbs={[{ label: "Documents", path: "/documents" }]} />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white text-center shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
          <div className="relative overflow-hidden bg-slate-950 px-8 py-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.35),transparent_55%)]" />
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
              <FileText className="size-7 text-indigo-200" />
              <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-red-500 ring-4 ring-slate-950">
                <AlertCircle className="size-3.5 text-white" />
              </span>
            </div>
          </div>
          <div className="px-8 py-7">
            <h2 className="text-lg font-bold text-gray-950">Document unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={onBack} className="gap-2">
                <ArrowLeft className="size-4" />
                Back to documents
              </Button>
              <Button onClick={() => window.location.reload()} className="gap-2">
                <RefreshCw className="size-4" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
