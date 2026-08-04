import { ArrowLeft, DatabaseZap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DatasetDetailLoadingState() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dataset">
      <div className="h-[268px] animate-pulse rounded-[26px] bg-gray-200/70" />

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
          <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mt-4 h-2.5 w-full animate-pulse rounded-full bg-gray-100" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-7 w-28 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_340px] xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-12 w-full animate-pulse rounded-xl bg-gray-50"
              />
            ))}
          </div>
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    </div>
  );
}

export function DatasetDetailErrorState({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-50">
        <DatabaseZap className="size-6 text-red-500" />
      </div>
      <p className="text-base font-semibold text-gray-900">
        This dataset could not be loaded
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{message}</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Button variant="outline" className="gap-2" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to datasets
        </Button>
        <Button className="gap-2" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}
