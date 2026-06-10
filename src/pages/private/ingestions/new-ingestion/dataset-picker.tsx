import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Database,
  FolderOpen,
  Loader2,
  Search,
  X,
} from "lucide-react";
import type { TDataset } from "@/core/datasets";
import { cn } from "@/lib/utils";

export function DatasetPicker({
  datasets,
  value,
  onChange,
  isLoading,
  error,
  onOpenManage,
}: {
  datasets: TDataset[];
  value: string;
  onChange: (id: string) => void;
  isLoading: boolean;
  error: string;
  onOpenManage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = datasets.find((dataset) => dataset.id === value) ?? null;
  const filtered = query.trim()
    ? datasets.filter((dataset) =>
        dataset.name.toLowerCase().includes(query.toLowerCase()),
      )
    : datasets;

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() =>
          !isLoading && datasets.length > 0 && setOpen((current) => !current)
        }
        disabled={isLoading || datasets.length === 0}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 bg-white text-left transition-all",
          open
            ? "border-indigo-300 ring-2 ring-indigo-50 shadow-sm"
            : "border-gray-200 hover:border-indigo-200 hover:shadow-sm",
          (isLoading || datasets.length === 0) &&
            "cursor-not-allowed opacity-80",
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <FolderOpen className="size-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading datasets...</p>
          ) : selected ? (
            <>
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {selected.name}
              </p>
              <p className="text-xs text-gray-400 leading-tight mt-0.5">
                {selected.documentCount} docs · {selected.status}
              </p>
            </>
          ) : datasets.length === 0 ? (
            <p className="text-sm text-gray-400">No datasets available</p>
          ) : (
            <p className="text-sm text-gray-400">Select a dataset...</p>
          )}
        </div>
        {isLoading ? (
          <Loader2 className="size-4 text-gray-400 animate-spin flex-shrink-0" />
        ) : (
          <ChevronDown
            className={cn(
              "size-4 text-gray-400 transition-transform flex-shrink-0",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
            <Search className="size-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search datasets..."
              className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Database className="size-6 text-gray-300" />
                <p className="text-xs text-gray-400">
                  {datasets.length === 0 && !error
                    ? "Create a dataset before starting ingestion."
                    : `No datasets match "${query}"`}
                </p>
              </div>
            ) : (
              filtered.map((dataset) => {
                const selectedItem = dataset.id === value;
                return (
                  <button
                    key={dataset.id}
                    type="button"
                    onClick={() => {
                      onChange(dataset.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left",
                      selectedItem ? "bg-indigo-50" : "hover:bg-gray-50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                        selectedItem ? "bg-indigo-100" : "bg-gray-100",
                      )}
                    >
                      <FolderOpen
                        className={cn(
                          "size-3.5",
                          selectedItem ? "text-indigo-600" : "text-gray-400",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          selectedItem ? "text-indigo-900" : "text-gray-800",
                        )}
                      >
                        {dataset.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {dataset.documentCount} docs ·{" "}
                        {dataset.tags.join(", ") || "No tags"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          dataset.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {dataset.status}
                      </span>
                      {selectedItem && (
                        <CheckCircle2 className="size-4 text-indigo-500" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50/50">
            <p className="text-xs text-gray-400">{datasets.length} datasets</p>
            <button
              type="button"
              onClick={onOpenManage}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              Manage datasets →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
