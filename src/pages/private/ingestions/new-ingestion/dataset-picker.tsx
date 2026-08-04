import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Check,
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
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = datasets.find((dataset) => dataset.id === value) ?? null;
  const filtered = query.trim()
    ? datasets.filter((dataset) =>
        dataset.name.toLowerCase().includes(query.toLowerCase()),
      )
    : datasets;
  const isDisabled = isLoading || datasets.length === 0;
  // The list can shrink under the cursor (a reload while the menu is open), so
  // resolve the highlight at read time rather than trusting the stored index.
  const cursor = activeIndex < filtered.length ? activeIndex : 0;

  const close = (returnFocus = false) => {
    setOpen(false);
    setQuery("");
    if (returnFocus) triggerRef.current?.focus();
  };

  const openMenu = () => {
    if (isDisabled) return;
    // Start on the current selection so the first arrow press moves from where
    // the user already is rather than from the top of the list.
    const index = datasets.findIndex((dataset) => dataset.id === value);
    setActiveIndex(index >= 0 ? index : 0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  // Keep the highlighted row inside the scroll viewport during arrow paging.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const commit = (id: string) => {
    onChange(id);
    close(true);
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu();
    }
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) =>
          filtered.length === 0 ? 0 : (current + 1) % filtered.length,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) =>
          filtered.length === 0
            ? 0
            : (current - 1 + filtered.length) % filtered.length,
        );
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(Math.max(filtered.length - 1, 0));
        break;
      case "Enter": {
        event.preventDefault();
        const target = filtered[cursor];
        if (target) commit(target.id);
        break;
      }
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close();
        break;
      default:
        break;
    }
  };

  // With no datasets the trigger is disabled, which also seals off the "Manage
  // datasets" link inside the menu — the one action that resolves the problem.
  // Surface it directly instead of leaving a dead end.
  if (!isLoading && datasets.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-gray-200">
          <Database className="size-4 text-gray-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800">No datasets yet</p>
          <p className="text-xs text-gray-500">
            {error || "Documents are ingested into a dataset — create one first."}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenManage}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Create a dataset
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label="Dataset"
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        disabled={isDisabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          open
            ? "border-indigo-500"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
          isDisabled && "cursor-not-allowed bg-gray-50 opacity-70",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <FolderOpen className="size-4 text-indigo-600" />
        </span>
        <span className="min-w-0 flex-1">
          {isLoading ? (
            <span className="block text-sm text-gray-400">
              Loading datasets…
            </span>
          ) : selected ? (
            <>
              <span className="block truncate text-sm font-semibold leading-tight text-gray-900">
                {selected.name}
              </span>
              <span className="mt-0.5 block text-xs leading-tight text-gray-500">
                {selected.documentCount} docs · {selected.status}
              </span>
            </>
          ) : (
            <span className="block text-sm text-gray-400">
              {datasets.length === 0
                ? "No datasets available"
                : "Select a dataset…"}
            </span>
          )}
        </span>
        {isLoading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-gray-400" />
        ) : (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-gray-400 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2.5 border-b border-gray-100 px-3.5 py-2.5">
            <Search className="size-4 shrink-0 text-gray-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                // A narrowed list makes the old cursor meaningless — start the
                // new result set from the top.
                setActiveIndex(0);
              }}
              onKeyDown={handleMenuKeyDown}
              placeholder="Search datasets…"
              aria-label="Search datasets"
              aria-controls={listboxId}
              aria-activedescendant={
                filtered[cursor]
                  ? `${listboxId}-${filtered[cursor].id}`
                  : undefined
              }
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(0);
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Datasets"
            className="max-h-56 overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Database className="size-5 text-gray-300" />
                <p className="text-xs text-gray-400">
                  {datasets.length === 0 && !error
                    ? "Create a dataset before starting ingestion."
                    : `No datasets match “${query}”`}
                </p>
              </div>
            ) : (
              filtered.map((dataset, index) => {
                const isSelected = dataset.id === value;
                const isActive = index === cursor;

                return (
                  <button
                    key={dataset.id}
                    id={`${listboxId}-${dataset.id}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(dataset.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                      isActive ? "bg-gray-100" : "bg-transparent",
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <FolderOpen
                        className={cn(
                          "size-3.5",
                          isSelected ? "text-indigo-600" : "text-gray-400",
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {dataset.name}
                      </span>
                      <span className="block truncate text-xs text-gray-400">
                        {dataset.documentCount} docs ·{" "}
                        {dataset.tags.join(", ") || "No tags"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        dataset.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {dataset.status}
                    </span>
                    <Check
                      className={cn(
                        "size-4 shrink-0 text-indigo-600",
                        !isSelected && "invisible",
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-3.5 py-2">
            <p className="text-xs text-gray-400">
              {datasets.length} dataset{datasets.length === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={onOpenManage}
              className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Manage datasets →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
