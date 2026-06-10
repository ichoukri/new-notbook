import { Search, X } from "lucide-react";

export function ReviewFilterBar({
  search,
  onSearch,
  typeLabel,
  typeValue,
  onType,
  typeOptions,
  pageValue,
  onPage,
  pageOptions,
  resultCount,
  totalCount,
}: {
  search: string;
  onSearch: (value: string) => void;
  typeLabel: string;
  typeValue: string;
  onType: (value: string) => void;
  typeOptions: string[];
  pageValue: string;
  onPage: (value: string) => void;
  pageOptions: number[];
  resultCount: number;
  totalCount: number;
}) {
  const hasFilters =
    search.trim() !== "" || typeValue !== "all" || pageValue !== "all";
  const selectClass =
    "rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-5 py-2.5">
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search content…"
          className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm text-gray-800 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
      </div>
      {typeOptions.length > 0 && (
        <select
          value={typeValue}
          onChange={(event) => onType(event.target.value)}
          className={selectClass}
          aria-label={`Filter by ${typeLabel}`}
        >
          <option value="all">All {typeLabel}</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
      {pageOptions.length > 0 && (
        <select
          value={pageValue}
          onChange={(event) => onPage(event.target.value)}
          className={selectClass}
          aria-label="Filter by page"
        >
          <option value="all">All pages</option>
          {pageOptions.map((page) => (
            <option key={page} value={String(page)}>
              Page {page}
            </option>
          ))}
        </select>
      )}
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            onSearch("");
            onType("all");
            onPage("all");
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100"
        >
          <X className="size-3.5" /> Clear
        </button>
      )}
      <span className="ml-auto text-xs tabular-nums text-gray-400">
        {hasFilters ? `${resultCount} of ${totalCount}` : `${totalCount} total`}
      </span>
    </div>
  );
}
