import { Database } from "lucide-react";

export function LoadingState() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="h-4 w-24 rounded bg-gray-100 mb-4" />
          <div className="h-4 w-40 rounded bg-gray-100 mb-2" />
          <div className="h-3 w-full rounded bg-gray-100 mb-6" />
          <div className="h-3 w-28 rounded bg-gray-100 mb-2" />
          <div className="h-3 w-20 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  search,
  onClear,
  onCreate,
}: {
  search: string;
  onClear: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="col-span-3 flex flex-col items-center py-20 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-1">
        <Database className="size-7 text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-gray-600">No datasets found</p>
      <p className="text-xs text-gray-400 text-center max-w-xs">
        {search
          ? `Nothing matched "${search}". Try a different search or clear your filters.`
          : "Create your first dataset to get started."}
      </p>
      {search ? (
        <button
          onClick={onClear}
          className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Clear filters
        </button>
      ) : (
        <button
          onClick={onCreate}
          className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Create a dataset
        </button>
      )}
    </div>
  );
}
