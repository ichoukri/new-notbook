import { Database, Tag, Trash2 } from "lucide-react";
import { formatDatasetDate, type TDataset } from "@/core/datasets";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "./dataset-page-types";
import { EmptyState } from "./dataset-states";

type DatasetListTableProps = {
  datasets: TDataset[];
  search: string;
  onOpen: (dataset: TDataset) => void;
  onDelete: (dataset: TDataset) => void;
  onClear: () => void;
  onCreate: () => void;
};

export function DatasetListTable({
  datasets,
  search,
  onOpen,
  onDelete,
  onClear,
  onCreate,
}: DatasetListTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {datasets.length === 0 ? (
        <EmptyState search={search} onClear={onClear} onCreate={onCreate} />
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500">
                Dataset
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500">
                Docs
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500">
                Tags
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500">
                Updated
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500">
                Status
              </th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {datasets.map((dataset) => (
              <DatasetListRow
                key={dataset.id}
                dataset={dataset}
                onOpen={() => onOpen(dataset)}
                onDelete={() => onDelete(dataset)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

type DatasetListRowProps = {
  dataset: TDataset;
  onOpen: () => void;
  onDelete: () => void;
};

function DatasetListRow({ dataset, onOpen, onDelete }: DatasetListRowProps) {
  const statusConfig = STATUS_CONFIG[dataset.status];

  return (
    <tr
      onClick={onOpen}
      className="group cursor-pointer transition-colors hover:bg-indigo-50/20"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
            <Database className="size-4 text-indigo-500" />
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white",
                statusConfig.dot,
              )}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
              {dataset.name}
            </p>
            <p className="max-w-[260px] truncate text-xs text-gray-400">
              {dataset.description || "No description provided."}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="text-sm font-semibold text-gray-800">
          {dataset.documentCount.toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          {dataset.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500"
            >
              <Tag className="size-2.5" />
              {tag}
            </span>
          ))}
          {dataset.tags.length > 2 && (
            <span className="text-[11px] text-gray-400">
              +{dataset.tags.length - 2}
            </span>
          )}
          {dataset.tags.length === 0 && (
            <span className="text-[11px] text-gray-400">No tags</span>
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-500">
        {formatDatasetDate(dataset.updatedAt)}
      </td>
      <td className="px-4 py-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
            statusConfig.badge,
          )}
        >
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}
