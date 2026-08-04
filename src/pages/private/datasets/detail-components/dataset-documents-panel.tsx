import { useMemo, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  FileText,
  Search,
  Upload,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  type TDatasetDocument,
  formatDatasetDateTime,
  formatFileSize,
} from "@/core/datasets";
import { cn } from "@/lib/utils";
import {
  type DatasetDocumentFilter,
  type DatasetDocumentSort,
  type DatasetDocumentSortKey,
  DOCUMENT_GROUP_CONFIG,
} from "./dataset-detail-types";
import {
  filterDatasetDocuments,
  getDocumentSourceLabel,
  sortDatasetDocuments,
} from "./dataset-detail-utils";

const COLUMNS: {
  key: DatasetDocumentSortKey;
  label: string;
  className?: string;
}[] = [
  { key: "name", label: "Document", className: "px-5" },
  { key: "size", label: "Size" },
  { key: "status", label: "Status" },
  { key: "added", label: "Added" },
];

export function DatasetDocumentsPanel({
  documents,
  search,
  filter,
  sort,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onOpenDocument,
  onUpload,
}: {
  documents: TDatasetDocument[];
  search: string;
  filter: DatasetDocumentFilter;
  sort: DatasetDocumentSort;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: DatasetDocumentFilter) => void;
  onSortChange: (sort: DatasetDocumentSort) => void;
  onOpenDocument: (documentId: string) => void;
  onUpload: () => void;
}) {
  const visibleDocuments = useMemo(
    () =>
      sortDatasetDocuments(
        filterDatasetDocuments(documents, { query: search, filter }),
        sort,
      ),
    [documents, search, filter, sort],
  );

  const isFiltered = filter !== "all" || search.trim().length > 0;

  const toggleSort = (key: DatasetDocumentSortKey) => {
    if (sort.key === key) {
      onSortChange({
        key,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
      return;
    }
    // Text reads best A→Z; sizes, dates and severity read best "biggest first".
    onSortChange({ key, direction: key === "name" ? "asc" : "desc" });
  };

  const clearFilters = () => {
    onSearchChange("");
    onFilterChange("all");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {isFiltered ? (
              <>
                Showing {visibleDocuments.length.toLocaleString()} of{" "}
                {documents.length.toLocaleString()}
                {filter !== "all" && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-medium text-gray-600">
                      {DOCUMENT_GROUP_CONFIG[filter].label}
                    </span>
                  </>
                )}
              </>
            ) : (
              "Documents currently linked to this dataset"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search documents..."
              aria-label="Search documents"
              className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-8 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-gray-500 transition-colors hover:text-gray-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {documents.length === 0 ? (
        <EmptyPanel
          title="No documents yet"
          description="Upload a file to start linking documents to this dataset."
          action={
            <Button size="sm" className="mt-4 gap-2" onClick={onUpload}>
              <Upload className="size-4" />
              Upload file
            </Button>
          }
        />
      ) : visibleDocuments.length === 0 ? (
        <EmptyPanel
          title="No matching documents"
          description="No document in this dataset matches the current search and filter."
          action={
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/60">
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      sort.key === column.key
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={cn("px-4 py-3 text-left", column.className)}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
                        sort.key === column.key
                          ? "text-gray-900"
                          : "text-gray-500 hover:text-gray-700",
                      )}
                    >
                      {column.label}
                      {sort.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                ))}
                <th scope="col" className="w-10 px-4 py-3">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleDocuments.map((document) => (
                <tr
                  key={document.id}
                  onClick={() => onOpenDocument(document.id)}
                  className="group cursor-pointer transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenDocument(document.id);
                      }}
                      className="block max-w-md truncate text-left text-sm font-medium text-gray-900 transition-colors group-hover:text-indigo-700"
                    >
                      {document.filename}
                    </button>
                    <p className="max-w-md truncate text-xs text-gray-500">
                      {getDocumentSourceLabel(document)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 tabular-nums">
                    {formatFileSize(document.fileSize)}
                    <span className="ml-1.5 text-xs uppercase text-gray-400">
                      {document.fileType}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={document.processingStatus} />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {formatDatasetDateTime(document.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <ChevronRight className="size-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EmptyPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gray-100">
        <FileText className="size-6 text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      {action}
    </div>
  );
}
