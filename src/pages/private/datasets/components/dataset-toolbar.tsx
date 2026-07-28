import { ArchiveRestore, LayoutGrid, List, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DatasetStatusCounts,
} from "./dataset-page-utils";
import type { DatasetStatusFilter, DatasetView } from "./dataset-page-types";

type DatasetToolbarProps = {
  search: string;
  statusFilter: DatasetStatusFilter;
  statusCounts: DatasetStatusCounts;
  view: DatasetView;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: DatasetStatusFilter) => void;
  onViewChange: (view: DatasetView) => void;
  onCreate: () => void;
  onImport: () => void;
};

export function DatasetToolbar({
  search,
  statusFilter,
  statusCounts,
  view,
  onSearchChange,
  onStatusFilterChange,
  onViewChange,
  onCreate,
  onImport,
}: DatasetToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-52 max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Search datasets, tags..."
          className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {(["all", "active", "archived"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusFilterChange(status)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all",
              statusFilter === status
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
            )}
          >
            {status === "all" ? "All" : status}
            <span
              className={cn(
                "min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none",
                statusFilter === status
                  ? "bg-white/25 text-white"
                  : "bg-gray-100 text-gray-500",
              )}
            >
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => onViewChange("grid")}
          className={cn(
            "px-3 py-2 transition-colors",
            view === "grid"
              ? "bg-indigo-50 text-indigo-600"
              : "text-gray-400 hover:bg-gray-50",
          )}
        >
          <LayoutGrid className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onViewChange("list")}
          className={cn(
            "px-3 py-2 transition-colors",
            view === "list"
              ? "bg-indigo-50 text-indigo-600"
              : "text-gray-400 hover:bg-gray-50",
          )}
        >
          <List className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onImport}
        className="ml-auto flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-800"
      >
        <ArchiveRestore className="size-4" />
        Import
      </button>

      <button
        type="button"
        onClick={onCreate}
        className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200"
      >
        <Plus className="size-4" />
        New Dataset
      </button>
    </div>
  );
}
